# -*- coding: utf-8 -*-
"""
Checklist Access Management
Handles free-tier gating, purchase tracking, and Stripe Checkout integration.

Free tier  : 3 checklists per browser (tracked via localStorage UUID + PostgreSQL)
10-pack    : $5.00 — 10 additional checklists, no expiry
Monthly    : $10.00 — unlimited checklists for 30 days

Storage    : PostgreSQL (Railway) with JSON file fallback for local dev
Payments   : Stripe Checkout (no webhook required — verified on success redirect)
"""

import os
import uuid
import json
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any, Tuple

# ──────────────────────────────────────────────────────────────────────────────
# CONSTANTS
# ──────────────────────────────────────────────────────────────────────────────

FREE_CHECKLIST_LIMIT = 3
PACK_CHECKLIST_COUNT = 10
PACK_PRICE_CENTS     = 500    # $5.00
MONTHLY_PRICE_CENTS  = 1000   # $10.00

FALLBACK_FILE = "user_data/checklist_access.json"

# Stripe is optional — gracefully unavailable if not installed / not configured
try:
    import stripe as _stripe
    _STRIPE_MODULE_AVAILABLE = True
except ImportError:
    _stripe = None
    _STRIPE_MODULE_AVAILABLE = False


# ──────────────────────────────────────────────────────────────────────────────
# DATABASE HELPERS (re-use connection logic from terms_agreement)
# ──────────────────────────────────────────────────────────────────────────────

def _get_database_url() -> Optional[str]:
    from terms_agreement import get_database_url
    return get_database_url()


def _is_postgres_available() -> bool:
    from terms_agreement import is_postgres_available
    return is_postgres_available()


def _get_db_conn():
    import psycopg2
    return psycopg2.connect(_get_database_url())


# ──────────────────────────────────────────────────────────────────────────────
# TABLE INITIALISATION
# ──────────────────────────────────────────────────────────────────────────────

_TABLES_INITIALISED = False


def init_tables() -> None:
    """Create checklist_users and checklist_purchases tables if they don't exist."""
    global _TABLES_INITIALISED
    if _TABLES_INITIALISED:
        return
    if not _is_postgres_available():
        _TABLES_INITIALISED = True
        return

    try:
        conn = _get_db_conn()
        cursor = conn.cursor()

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS checklist_users (
                id           SERIAL PRIMARY KEY,
                user_id      VARCHAR(36) UNIQUE NOT NULL,
                free_uses_count INTEGER DEFAULT 0,
                created_at   TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        """)

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS checklist_purchases (
                id                      SERIAL PRIMARY KEY,
                purchase_id             VARCHAR(36)  UNIQUE NOT NULL,
                user_id                 VARCHAR(36)  NOT NULL REFERENCES checklist_users(user_id),
                stripe_session_id       VARCHAR(255) UNIQUE,
                stripe_payment_intent   VARCHAR(255),
                purchase_type           VARCHAR(20)  NOT NULL,  -- '10_pack' | 'monthly'
                amount_cents            INTEGER      NOT NULL,
                status                  VARCHAR(20)  DEFAULT 'pending',  -- 'pending' | 'completed' | 'refunded'
                uses_remaining          INTEGER,      -- NULL for monthly, starts at 10 for 10_pack
                purchased_at            TIMESTAMP WITH TIME ZONE,
                expires_at              TIMESTAMP WITH TIME ZONE,  -- NULL for 10_pack, set for monthly
                created_at              TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        """)

        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_cl_purchases_user_id
            ON checklist_purchases(user_id)
        """)
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_cl_purchases_stripe_session
            ON checklist_purchases(stripe_session_id)
        """)
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_cl_purchases_status
            ON checklist_purchases(status, purchase_type)
        """)

        conn.commit()
        conn.close()
        _TABLES_INITIALISED = True
    except Exception as e:
        print(f"[checklist_access] init_tables error: {e}")


# ──────────────────────────────────────────────────────────────────────────────
# USER MANAGEMENT
# ──────────────────────────────────────────────────────────────────────────────

def get_or_create_user(user_id: str) -> Dict[str, Any]:
    """
    Fetch the checklist_users row for *user_id*, creating it if it doesn't exist.
    Returns a dict: {'user_id': str, 'free_uses_count': int}
    Falls back to JSON storage when PostgreSQL is unavailable.
    """
    if not _is_postgres_available():
        return _json_get_or_create_user(user_id)

    try:
        init_tables()
        conn   = _get_db_conn()
        cursor = conn.cursor()

        cursor.execute(
            "SELECT user_id, free_uses_count FROM checklist_users WHERE user_id = %s",
            (user_id,)
        )
        row = cursor.fetchone()

        if row:
            cursor.execute(
                "UPDATE checklist_users SET last_seen_at = %s WHERE user_id = %s",
                (datetime.now(timezone.utc), user_id)
            )
            conn.commit()
            conn.close()
            return {"user_id": row[0], "free_uses_count": row[1]}

        cursor.execute(
            "INSERT INTO checklist_users (user_id, free_uses_count) VALUES (%s, 0)"
            " RETURNING user_id, free_uses_count",
            (user_id,)
        )
        row = cursor.fetchone()
        conn.commit()
        conn.close()
        return {"user_id": row[0], "free_uses_count": row[1]}

    except Exception as e:
        print(f"[checklist_access] get_or_create_user DB error: {e}")
        return _json_get_or_create_user(user_id)


# ──────────────────────────────────────────────────────────────────────────────
# ACCESS STATUS
# ──────────────────────────────────────────────────────────────────────────────

def get_access_status(user_id: str) -> Dict[str, Any]:
    """
    Return an access-status dict:
    {
        'can_use'         : bool,
        'reason'          : 'free' | '10_pack' | 'monthly' | 'blocked',
        'free_remaining'  : int,
        'active_purchase' : dict | None,   # purchase details when reason is '10_pack'/'monthly'
        'free_limit'      : int,           # always FREE_CHECKLIST_LIMIT (3)
    }
    """
    user           = get_or_create_user(user_id)
    free_used      = user.get("free_uses_count", 0)
    free_remaining = max(0, FREE_CHECKLIST_LIMIT - free_used)

    active_purchase = _get_active_purchase(user_id)

    if active_purchase:
        return {
            "can_use"         : True,
            "reason"          : active_purchase["purchase_type"],
            "free_remaining"  : free_remaining,
            "active_purchase" : active_purchase,
            "free_limit"      : FREE_CHECKLIST_LIMIT,
        }

    if free_remaining > 0:
        return {
            "can_use"         : True,
            "reason"          : "free",
            "free_remaining"  : free_remaining,
            "active_purchase" : None,
            "free_limit"      : FREE_CHECKLIST_LIMIT,
        }

    return {
        "can_use"         : False,
        "reason"          : "blocked",
        "free_remaining"  : 0,
        "active_purchase" : None,
        "free_limit"      : FREE_CHECKLIST_LIMIT,
    }


def _get_active_purchase(user_id: str) -> Optional[Dict[str, Any]]:
    """Return the user's currently active purchase or None."""
    if not _is_postgres_available():
        return _json_get_active_purchase(user_id)

    try:
        conn   = _get_db_conn()
        cursor = conn.cursor()
        now    = datetime.now(timezone.utc)

        # Monthly pass — not expired
        cursor.execute("""
            SELECT purchase_type, uses_remaining, expires_at
            FROM   checklist_purchases
            WHERE  user_id       = %s
              AND  status        = 'completed'
              AND  purchase_type = 'monthly'
              AND  expires_at    > %s
            ORDER  BY purchased_at DESC
            LIMIT  1
        """, (user_id, now))
        row = cursor.fetchone()
        if row:
            conn.close()
            return {
                "purchase_type" : "monthly",
                "uses_remaining": None,
                "expires_at"    : row[2].isoformat() if row[2] else None,
            }

        # 10-pack — uses remaining
        cursor.execute("""
            SELECT purchase_type, uses_remaining
            FROM   checklist_purchases
            WHERE  user_id         = %s
              AND  status          = 'completed'
              AND  purchase_type   = '10_pack'
              AND  uses_remaining  > 0
            ORDER  BY purchased_at DESC
            LIMIT  1
        """, (user_id,))
        row = cursor.fetchone()
        conn.close()
        if row:
            return {
                "purchase_type" : "10_pack",
                "uses_remaining": row[1],
                "expires_at"    : None,
            }

        return None

    except Exception as e:
        print(f"[checklist_access] _get_active_purchase DB error: {e}")
        return None


# ──────────────────────────────────────────────────────────────────────────────
# USAGE RECORDING
# ──────────────────────────────────────────────────────────────────────────────

def record_checklist_use(user_id: str) -> bool:
    """
    Consume one checklist credit.  Call this AFTER a checklist is successfully
    generated.  Returns True on success.
    """
    status = get_access_status(user_id)
    if not status["can_use"]:
        return False

    reason = status["reason"]

    if not _is_postgres_available():
        return _json_record_use(user_id, reason)

    try:
        conn   = _get_db_conn()
        cursor = conn.cursor()

        if reason == "free":
            cursor.execute(
                "UPDATE checklist_users"
                " SET free_uses_count = free_uses_count + 1, last_seen_at = %s"
                " WHERE user_id = %s",
                (datetime.now(timezone.utc), user_id)
            )

        elif reason == "10_pack":
            # Decrement the oldest active pack's remaining count
            cursor.execute("""
                UPDATE checklist_purchases
                SET    uses_remaining = uses_remaining - 1
                WHERE  id = (
                    SELECT id FROM checklist_purchases
                    WHERE  user_id        = %s
                      AND  status         = 'completed'
                      AND  purchase_type  = '10_pack'
                      AND  uses_remaining > 0
                    ORDER  BY purchased_at DESC
                    LIMIT  1
                )
            """, (user_id,))

        elif reason == "monthly":
            cursor.execute(
                "UPDATE checklist_users SET last_seen_at = %s WHERE user_id = %s",
                (datetime.now(timezone.utc), user_id)
            )

        conn.commit()
        conn.close()
        return True

    except Exception as e:
        print(f"[checklist_access] record_checklist_use DB error: {e}")
        return False


# ──────────────────────────────────────────────────────────────────────────────
# STRIPE CHECKOUT
# ──────────────────────────────────────────────────────────────────────────────

def is_stripe_configured() -> bool:
    """True when the Stripe library is installed and a secret key is set."""
    return _STRIPE_MODULE_AVAILABLE and bool(os.environ.get("STRIPE_SECRET_KEY", ""))


def create_stripe_checkout_session(
    user_id      : str,
    purchase_type: str,   # '10_pack' | 'monthly'
    success_url  : str,   # Must contain {CHECKOUT_SESSION_ID} placeholder
    cancel_url   : str,
) -> Tuple[Optional[str], Optional[str]]:
    """
    Create a Stripe Checkout Session.

    Returns (checkout_url, error_message).
    *success_url* should include ``{CHECKOUT_SESSION_ID}`` so Stripe can inject
    the session ID.  Example:
        ``https://myapp.com/Checklist?payment=success&sid={CHECKOUT_SESSION_ID}``
    """
    if not is_stripe_configured():
        return None, "Stripe is not configured (missing STRIPE_SECRET_KEY)."

    if purchase_type == "10_pack":
        price_cents  = PACK_PRICE_CENTS
        product_name = "10 Car Buying Checklist Credits"
        product_desc = "Run 10 more Car Buying Checklists — credits never expire"
    elif purchase_type == "monthly":
        price_cents  = MONTHLY_PRICE_CENTS
        product_name = "1-Month Unlimited Car Buying Checklists"
        product_desc = "Unlimited Car Buying Checklists for 30 days"
    else:
        return None, f"Unknown purchase type: {purchase_type}"

    purchase_id = str(uuid.uuid4())

    try:
        _stripe.api_key = os.environ["STRIPE_SECRET_KEY"]

        # Record a pending purchase row before redirecting
        _create_pending_purchase(user_id, purchase_id, purchase_type, price_cents)

        session = _stripe.checkout.Session.create(
            payment_method_types=["card"],
            line_items=[{
                "price_data": {
                    "currency"    : "usd",
                    "unit_amount" : price_cents,
                    "product_data": {
                        "name"       : product_name,
                        "description": product_desc,
                    },
                },
                "quantity": 1,
            }],
            mode       ="payment",
            # Stripe replaces {CHECKOUT_SESSION_ID} with the real session ID
            success_url=success_url + f"&stripe_session_id={{CHECKOUT_SESSION_ID}}"
                                    + f"&uid={user_id}&pid={purchase_id}",
            cancel_url =cancel_url,
            metadata   ={
                "user_id"      : user_id,
                "purchase_type": purchase_type,
                "purchase_id"  : purchase_id,
            },
        )

        # Persist the Stripe session ID
        _link_stripe_session(purchase_id, session.id)

        return session.url, None

    except Exception as e:
        print(f"[checklist_access] Stripe error: {e}")
        return None, str(e)


def verify_and_activate_purchase(
    stripe_session_id: str,
    user_id          : str,
    purchase_id      : str,
) -> Tuple[bool, str]:
    """
    Verify payment with Stripe and activate the purchase.
    Idempotent — safe to call multiple times for the same session.

    Returns (success, message).
    """
    if not is_stripe_configured():
        return False, "Stripe is not configured."

    try:
        _stripe.api_key = os.environ["STRIPE_SECRET_KEY"]
        session = _stripe.checkout.Session.retrieve(stripe_session_id)
    except Exception as e:
        return False, f"Could not retrieve Stripe session: {e}"

    if session.payment_status != "paid":
        return False, f"Payment not complete (status: {session.payment_status})"

    purchase_type = session.metadata.get("purchase_type", "")
    payment_intent = session.payment_intent or ""

    now           = datetime.now(timezone.utc)
    uses_remaining = PACK_CHECKLIST_COUNT if purchase_type == "10_pack" else None
    expires_at     = (now + timedelta(days=30)) if purchase_type == "monthly" else None

    if not _is_postgres_available():
        return _json_activate_purchase(
            purchase_id, user_id, purchase_type,
            payment_intent, uses_remaining, expires_at
        )

    try:
        conn   = _get_db_conn()
        cursor = conn.cursor()

        # Idempotency — check if already activated
        cursor.execute(
            "SELECT status FROM checklist_purchases"
            " WHERE stripe_session_id = %s OR purchase_id = %s",
            (stripe_session_id, purchase_id)
        )
        row = cursor.fetchone()
        if row and row[0] == "completed":
            conn.close()
            return True, "Purchase already activated"

        cursor.execute("""
            UPDATE checklist_purchases
            SET    status                = 'completed',
                   stripe_payment_intent = %s,
                   uses_remaining        = %s,
                   purchased_at          = %s,
                   expires_at            = %s
            WHERE  (stripe_session_id = %s OR purchase_id = %s)
              AND  user_id = %s
        """, (
            payment_intent,
            uses_remaining,
            now,
            expires_at,
            stripe_session_id,
            purchase_id,
            user_id,
        ))

        conn.commit()
        conn.close()
        return True, "Purchase activated"

    except Exception as e:
        return False, f"DB error activating purchase: {e}"


# ──────────────────────────────────────────────────────────────────────────────
# INTERNAL DB HELPERS
# ──────────────────────────────────────────────────────────────────────────────

def _create_pending_purchase(
    user_id      : str,
    purchase_id  : str,
    purchase_type: str,
    amount_cents : int,
) -> None:
    if not _is_postgres_available():
        _json_save_pending_purchase(user_id, purchase_id, purchase_type, amount_cents)
        return
    try:
        conn   = _get_db_conn()
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO checklist_purchases"
            " (purchase_id, user_id, purchase_type, amount_cents, status)"
            " VALUES (%s, %s, %s, %s, 'pending')"
            " ON CONFLICT (purchase_id) DO NOTHING",
            (purchase_id, user_id, purchase_type, amount_cents)
        )
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"[checklist_access] _create_pending_purchase error: {e}")


def _link_stripe_session(purchase_id: str, stripe_session_id: str) -> None:
    if not _is_postgres_available():
        return
    try:
        conn   = _get_db_conn()
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE checklist_purchases SET stripe_session_id = %s WHERE purchase_id = %s",
            (stripe_session_id, purchase_id)
        )
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"[checklist_access] _link_stripe_session error: {e}")


# ──────────────────────────────────────────────────────────────────────────────
# JSON FALLBACK STORAGE
# ──────────────────────────────────────────────────────────────────────────────

def _json_load() -> dict:
    os.makedirs(os.path.dirname(FALLBACK_FILE), exist_ok=True)
    if os.path.exists(FALLBACK_FILE):
        try:
            with open(FALLBACK_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return {"users": {}, "purchases": []}


def _json_save(data: dict) -> None:
    os.makedirs(os.path.dirname(FALLBACK_FILE), exist_ok=True)
    with open(FALLBACK_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, default=str)


def _json_get_or_create_user(user_id: str) -> dict:
    data = _json_load()
    if user_id not in data["users"]:
        data["users"][user_id] = {"free_uses_count": 0}
        _json_save(data)
    return {"user_id": user_id, **data["users"][user_id]}


def _json_get_active_purchase(user_id: str) -> Optional[Dict]:
    data = _json_load()
    now  = datetime.now(timezone.utc)
    for p in data.get("purchases", []):
        if p.get("user_id") != user_id or p.get("status") != "completed":
            continue
        if p.get("purchase_type") == "monthly" and p.get("expires_at"):
            expires = datetime.fromisoformat(str(p["expires_at"]))
            if expires.tzinfo is None:
                expires = expires.replace(tzinfo=timezone.utc)
            if expires > now:
                return {"purchase_type": "monthly", "uses_remaining": None, "expires_at": p["expires_at"]}
        elif p.get("purchase_type") == "10_pack" and p.get("uses_remaining", 0) > 0:
            return {"purchase_type": "10_pack", "uses_remaining": p["uses_remaining"], "expires_at": None}
    return None


def _json_record_use(user_id: str, reason: str) -> bool:
    data = _json_load()
    if reason == "free":
        data["users"].setdefault(user_id, {"free_uses_count": 0})
        data["users"][user_id]["free_uses_count"] += 1
    elif reason == "10_pack":
        for p in reversed(data.get("purchases", [])):
            if (p.get("user_id") == user_id and p.get("status") == "completed"
                    and p.get("purchase_type") == "10_pack"
                    and p.get("uses_remaining", 0) > 0):
                p["uses_remaining"] -= 1
                break
    _json_save(data)
    return True


def _json_save_pending_purchase(
    user_id: str, purchase_id: str, purchase_type: str, amount_cents: int
) -> None:
    data = _json_load()
    data.setdefault("purchases", []).append({
        "purchase_id"  : purchase_id,
        "user_id"      : user_id,
        "purchase_type": purchase_type,
        "amount_cents" : amount_cents,
        "status"       : "pending",
        "uses_remaining": None,
        "expires_at"   : None,
        "created_at"   : datetime.now(timezone.utc).isoformat(),
    })
    _json_save(data)


def _json_activate_purchase(
    purchase_id   : str,
    user_id       : str,
    purchase_type : str,
    payment_intent: str,
    uses_remaining: Optional[int],
    expires_at    : Optional[datetime],
) -> Tuple[bool, str]:
    data = _json_load()
    for p in data.get("purchases", []):
        if p.get("purchase_id") == purchase_id and p.get("user_id") == user_id:
            p["status"]                = "completed"
            p["stripe_payment_intent"] = payment_intent
            p["uses_remaining"]        = uses_remaining
            p["expires_at"]            = expires_at.isoformat() if expires_at else None
            p["purchased_at"]          = datetime.now(timezone.utc).isoformat()
            _json_save(data)
            return True, "Purchase activated"
    return False, "Purchase record not found"
