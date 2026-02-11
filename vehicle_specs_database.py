"""
Vehicle Specifications Database
Comprehensive specs data: horsepower, seats, cargo space for all vehicles
MPG data is referenced from vehicle_mpg_database.py
"""

VEHICLE_SPECS_DATABASE = {
    'Acura': {
        'ADX': {
            'default_specs': {'horsepower': 192, 'seats': 5, 'cargo_cu_ft': 25.3},
            'years': {
                (2025, 2026): {
                    'ADX': {'horsepower': 192, 'seats': 5, 'cargo_cu_ft': 25.3},
                    'ADX A-SPEC': {'horsepower': 192, 'seats': 5, 'cargo_cu_ft': 25.3},
                    'ADX A-SPEC Advance': {'horsepower': 192, 'seats': 5, 'cargo_cu_ft': 25.3}
                }
            }
        },
        'ILX': {
            'default_specs': {'horsepower': 201, 'seats': 5, 'cargo_cu_ft': 12.4},
            'years': {
                (2013, 2022): {
                    'ILX': {'horsepower': 201, 'seats': 5, 'cargo_cu_ft': 12.4},
                    'ILX Premium Package': {'horsepower': 201, 'seats': 5, 'cargo_cu_ft': 12.4},
                    'ILX Technology Package': {'horsepower': 201, 'seats': 5, 'cargo_cu_ft': 12.4},
                    'ILX A-SPEC': {'horsepower': 201, 'seats': 5, 'cargo_cu_ft': 12.4}
                }
            }
        },
        'Integra': {
            'default_specs': {'horsepower': 200, 'seats': 5, 'cargo_cu_ft': 24.3},
            'years': {
                (2022, 2026): {
                    'Integra': {'horsepower': 200, 'seats': 5, 'cargo_cu_ft': 24.3},
                    'Integra A-SPEC': {'horsepower': 200, 'seats': 5, 'cargo_cu_ft': 24.3},
                    'Integra A-SPEC Technology': {'horsepower': 200, 'seats': 5, 'cargo_cu_ft': 24.3},
                    'Integra Type S': {'horsepower': 320, 'seats': 5, 'cargo_cu_ft': 24.3}
                }
            }
        },
        'MDX': {
            'default_specs': {'horsepower': 290, 'seats': 7, 'cargo_cu_ft': 16.3},
            'years': {
                (2022, 2026): {
                    'MDX': {'horsepower': 290, 'seats': 7, 'cargo_cu_ft': 16.3},
                    'MDX Technology Package': {'horsepower': 290, 'seats': 7, 'cargo_cu_ft': 16.3},
                    'MDX A-SPEC Package': {'horsepower': 290, 'seats': 7, 'cargo_cu_ft': 16.3},
                    'MDX Advance Package': {'horsepower': 290, 'seats': 7, 'cargo_cu_ft': 16.3},
                    'MDX Type S': {'horsepower': 355, 'seats': 7, 'cargo_cu_ft': 16.3},
                    'MDX Type S Advance': {'horsepower': 355, 'seats': 7, 'cargo_cu_ft': 16.3}
                },
                (2014, 2021): {
                    'MDX': {'horsepower': 290, 'seats': 7, 'cargo_cu_ft': 15.0},
                    'MDX Technology Package': {'horsepower': 290, 'seats': 7, 'cargo_cu_ft': 15.0},
                    'MDX A-SPEC Package': {'horsepower': 290, 'seats': 7, 'cargo_cu_ft': 15.0},
                    'MDX Advance Package': {'horsepower': 290, 'seats': 7, 'cargo_cu_ft': 15.0}
                },
                (2001, 2013): {
                    'MDX': {'horsepower': 270, 'seats': 7, 'cargo_cu_ft': 15.0},
                    'MDX Technology Package': {'horsepower': 270, 'seats': 7, 'cargo_cu_ft': 15.0},
                    'MDX Advance Package': {'horsepower': 270, 'seats': 7, 'cargo_cu_ft': 15.0}
                }
            }
        },
        'NSX': {
            'default_specs': {'horsepower': 573, 'seats': 2, 'cargo_cu_ft': 4.4},
            'years': {
                (2017, 2022): {
                    'NSX': {'horsepower': 573, 'seats': 2, 'cargo_cu_ft': 4.4},
                    'NSX Type S': {'horsepower': 600, 'seats': 2, 'cargo_cu_ft': 4.4}
                }
            }
        },
        'RDX': {
            'default_specs': {'horsepower': 272, 'seats': 5, 'cargo_cu_ft': 29.5},
            'years': {
                (2019, 2026): {
                    'RDX': {'horsepower': 272, 'seats': 5, 'cargo_cu_ft': 29.5},
                    'RDX Technology Package': {'horsepower': 272, 'seats': 5, 'cargo_cu_ft': 29.5},
                    'RDX A-SPEC Package': {'horsepower': 272, 'seats': 5, 'cargo_cu_ft': 29.5},
                    'RDX Advance Package': {'horsepower': 272, 'seats': 5, 'cargo_cu_ft': 29.5}
                },
                (2007, 2018): {
                    'RDX': {'horsepower': 279, 'seats': 5, 'cargo_cu_ft': 26.1},
                    'RDX Technology Package': {'horsepower': 279, 'seats': 5, 'cargo_cu_ft': 26.1},
                    'RDX Advance Package': {'horsepower': 279, 'seats': 5, 'cargo_cu_ft': 26.1}
                }
            }
        },
        'TLX': {
            'default_specs': {'horsepower': 272, 'seats': 5, 'cargo_cu_ft': 13.5},
            'years': {
                (2021, 2026): {
                    'TLX': {'horsepower': 272, 'seats': 5, 'cargo_cu_ft': 13.5},
                    'TLX Technology Package': {'horsepower': 272, 'seats': 5, 'cargo_cu_ft': 13.5},
                    'TLX A-SPEC Package': {'horsepower': 272, 'seats': 5, 'cargo_cu_ft': 13.5},
                    'TLX Advance Package': {'horsepower': 272, 'seats': 5, 'cargo_cu_ft': 13.5},
                    'TLX Type S': {'horsepower': 355, 'seats': 5, 'cargo_cu_ft': 13.5}
                },
                (2015, 2020): {
                    'TLX': {'horsepower': 206, 'seats': 5, 'cargo_cu_ft': 14.3},
                    'TLX Technology Package': {'horsepower': 206, 'seats': 5, 'cargo_cu_ft': 14.3},
                    'TLX A-SPEC Package': {'horsepower': 290, 'seats': 5, 'cargo_cu_ft': 14.3},
                    'TLX Advance Package': {'horsepower': 290, 'seats': 5, 'cargo_cu_ft': 14.3}
                }
            }
        }
    },
    'Alfa Romeo': {
        '4C': {
            'default_specs': {'horsepower': 237, 'seats': 2, 'cargo_cu_ft': 3.7},
            'years': {
                (2015, 2020): {
                    '4C': {'horsepower': 237, 'seats': 2, 'cargo_cu_ft': 3.7},
                    '4C Spider': {'horsepower': 237, 'seats': 2, 'cargo_cu_ft': 3.7}
                }
            }
        },
        'Giulia': {
            'default_specs': {'horsepower': 268, 'seats': 5, 'cargo_cu_ft': 13.0},
            'years': {
                (2017, 2026): {
                    'Giulia': {'horsepower': 268, 'seats': 5, 'cargo_cu_ft': 13.0},
                    'Giulia Ti': {'horsepower': 268, 'seats': 5, 'cargo_cu_ft': 13.0},
                    'Giulia Ti Sport': {'horsepower': 268, 'seats': 5, 'cargo_cu_ft': 13.0},
                    'Giulia Quadrifoglio': {'horsepower': 505, 'seats': 5, 'cargo_cu_ft': 13.0}
                }
            }
        },
        'Stelvio': {
            'default_specs': {'horsepower': 280, 'seats': 5, 'cargo_cu_ft': 18.5},
            'years': {
                (2018, 2026): {
                    'Stelvio': {'horsepower': 280, 'seats': 5, 'cargo_cu_ft': 18.5},
                    'Stelvio Ti': {'horsepower': 280, 'seats': 5, 'cargo_cu_ft': 18.5},
                    'Stelvio Ti Sport': {'horsepower': 280, 'seats': 5, 'cargo_cu_ft': 18.5},
                    'Stelvio Quadrifoglio': {'horsepower': 505, 'seats': 5, 'cargo_cu_ft': 18.5}
                }
            }
        }
    },
    'Audi': {
        'A3': {
            'default_specs': {'horsepower': 201, 'seats': 5, 'cargo_cu_ft': 10.0},
            'years': {
                (2022, 2026): {
                    'A3 Premium': {'horsepower': 201, 'seats': 5, 'cargo_cu_ft': 10.0},
                    'A3 Premium Plus': {'horsepower': 201, 'seats': 5, 'cargo_cu_ft': 10.0},
                    'A3 Prestige': {'horsepower': 201, 'seats': 5, 'cargo_cu_ft': 10.0},
                    'S3': {'horsepower': 306, 'seats': 5, 'cargo_cu_ft': 10.0}
                },
                (2006, 2021): {
                    'A3 Premium': {'horsepower': 184, 'seats': 5, 'cargo_cu_ft': 10.0},
                    'A3 Premium Plus': {'horsepower': 184, 'seats': 5, 'cargo_cu_ft': 10.0},
                    'A3 Prestige': {'horsepower': 184, 'seats': 5, 'cargo_cu_ft': 10.0},
                    'S3': {'horsepower': 288, 'seats': 5, 'cargo_cu_ft': 10.0}
                }
            }
        },
        'A4': {
            'default_specs': {'horsepower': 201, 'seats': 5, 'cargo_cu_ft': 12.4},
            'years': {
                (2020, 2026): {
                    'A4 40 TFSI': {'horsepower': 201, 'seats': 5, 'cargo_cu_ft': 12.4},
                    'A4 45 TFSI quattro Premium': {'horsepower': 261, 'seats': 5, 'cargo_cu_ft': 12.4},
                    'A4 45 TFSI quattro Premium Plus': {'horsepower': 261, 'seats': 5, 'cargo_cu_ft': 12.4},
                    'A4 45 TFSI quattro Prestige': {'horsepower': 261, 'seats': 5, 'cargo_cu_ft': 12.4},
                    'S4': {'horsepower': 349, 'seats': 5, 'cargo_cu_ft': 12.4}
                },
                (2000, 2019): {
                    'A4 40 TFSI': {'horsepower': 188, 'seats': 5, 'cargo_cu_ft': 12.4},
                    'A4 45 TFSI quattro Premium': {'horsepower': 248, 'seats': 5, 'cargo_cu_ft': 12.4},
                    'A4 45 TFSI quattro Premium Plus': {'horsepower': 248, 'seats': 5, 'cargo_cu_ft': 12.4},
                    'A4 45 TFSI quattro Prestige': {'horsepower': 248, 'seats': 5, 'cargo_cu_ft': 12.4},
                    'S4': {'horsepower': 333, 'seats': 5, 'cargo_cu_ft': 12.4}
                }
            }
        },
        'A5': {
            'default_specs': {'horsepower': 261, 'seats': 5, 'cargo_cu_ft': 12.6},
            'years': {
                (2008, 2026): {
                    'A5 Coupe 45 TFSI quattro Premium': {'horsepower': 261, 'seats': 4, 'cargo_cu_ft': 12.6},
                    'A5 Coupe 45 TFSI quattro Premium Plus': {'horsepower': 261, 'seats': 4, 'cargo_cu_ft': 12.6},
                    'A5 Coupe 45 TFSI quattro Prestige': {'horsepower': 261, 'seats': 4, 'cargo_cu_ft': 12.6},
                    'A5 Sportback 45 TFSI quattro Premium': {'horsepower': 261, 'seats': 5, 'cargo_cu_ft': 21.8},
                    'A5 Sportback 45 TFSI quattro Premium Plus': {'horsepower': 261, 'seats': 5, 'cargo_cu_ft': 21.8},
                    'A5 Sportback 45 TFSI quattro Prestige': {'horsepower': 261, 'seats': 5, 'cargo_cu_ft': 21.8},
                    'S5 Coupe': {'horsepower': 349, 'seats': 4, 'cargo_cu_ft': 12.6},
                    'S5 Sportback': {'horsepower': 349, 'seats': 5, 'cargo_cu_ft': 21.8}
                }
            }
        },
        'A6': {
            'default_specs': {'horsepower': 261, 'seats': 5, 'cargo_cu_ft': 14.1},
            'years': {
                (2019, 2026): {
                    'A6 45 TFSI quattro Premium': {'horsepower': 261, 'seats': 5, 'cargo_cu_ft': 14.1},
                    'A6 45 TFSI quattro Premium Plus': {'horsepower': 261, 'seats': 5, 'cargo_cu_ft': 14.1},
                    'A6 45 TFSI quattro Prestige': {'horsepower': 261, 'seats': 5, 'cargo_cu_ft': 14.1},
                    'A6 55 TFSI quattro Premium Plus': {'horsepower': 335, 'seats': 5, 'cargo_cu_ft': 14.1},
                    'A6 55 TFSI quattro Prestige': {'horsepower': 335, 'seats': 5, 'cargo_cu_ft': 14.1},
                    'S6': {'horsepower': 444, 'seats': 5, 'cargo_cu_ft': 14.1}
                },
                (2000, 2018): {
                    'A6 45 TFSI quattro Premium': {'horsepower': 248, 'seats': 5, 'cargo_cu_ft': 14.1},
                    'A6 45 TFSI quattro Premium Plus': {'horsepower': 248, 'seats': 5, 'cargo_cu_ft': 14.1},
                    'A6 45 TFSI quattro Prestige': {'horsepower': 248, 'seats': 5, 'cargo_cu_ft': 14.1},
                    'A6 55 TFSI quattro Premium Plus': {'horsepower': 333, 'seats': 5, 'cargo_cu_ft': 14.1},
                    'A6 55 TFSI quattro Prestige': {'horsepower': 333, 'seats': 5, 'cargo_cu_ft': 14.1},
                    'S6': {'horsepower': 420, 'seats': 5, 'cargo_cu_ft': 14.1}
                }
            }
        },
        'A7': {
            'default_specs': {'horsepower': 335, 'seats': 5, 'cargo_cu_ft': 19.9},
            'years': {
                (2012, 2026): {
                    'A7 55 TFSI quattro Premium Plus': {'horsepower': 335, 'seats': 5, 'cargo_cu_ft': 19.9},
                    'A7 55 TFSI quattro Prestige': {'horsepower': 335, 'seats': 5, 'cargo_cu_ft': 19.9},
                    'S7': {'horsepower': 444, 'seats': 5, 'cargo_cu_ft': 19.9}
                }
            }
        },
        'A8': {
            'default_specs': {'horsepower': 335, 'seats': 5, 'cargo_cu_ft': 12.9},
            'years': {
                (2019, 2026): {
                    'A8 55 TFSI quattro': {'horsepower': 335, 'seats': 5, 'cargo_cu_ft': 12.9},
                    'A8 L 55 TFSI quattro': {'horsepower': 335, 'seats': 5, 'cargo_cu_ft': 12.9},
                    'A8 60 TFSI quattro': {'horsepower': 453, 'seats': 5, 'cargo_cu_ft': 12.9},
                    'A8 L 60 TFSI quattro': {'horsepower': 453, 'seats': 5, 'cargo_cu_ft': 12.9},
                    'S8': {'horsepower': 563, 'seats': 5, 'cargo_cu_ft': 12.9}
                },
                (2000, 2018): {
                    'A8 55 TFSI quattro': {'horsepower': 310, 'seats': 5, 'cargo_cu_ft': 12.9},
                    'A8 L 55 TFSI quattro': {'horsepower': 310, 'seats': 5, 'cargo_cu_ft': 12.9},
                    'A8 60 TFSI quattro': {'horsepower': 435, 'seats': 5, 'cargo_cu_ft': 12.9},
                    'A8 L 60 TFSI quattro': {'horsepower': 435, 'seats': 5, 'cargo_cu_ft': 12.9},
                    'S8': {'horsepower': 520, 'seats': 5, 'cargo_cu_ft': 12.9}
                }
            }
        },
        'Q3': {
            'default_specs': {'horsepower': 228, 'seats': 5, 'cargo_cu_ft': 23.7},
            'years': {
                (2019, 2026): {
                    'Q3 45 TFSI Premium': {'horsepower': 228, 'seats': 5, 'cargo_cu_ft': 23.7},
                    'Q3 45 TFSI Premium Plus': {'horsepower': 228, 'seats': 5, 'cargo_cu_ft': 23.7},
                    'Q3 45 TFSI Prestige': {'horsepower': 228, 'seats': 5, 'cargo_cu_ft': 23.7}
                },
                (2015, 2018): {
                    'Q3 45 TFSI Premium': {'horsepower': 200, 'seats': 5, 'cargo_cu_ft': 16.7},
                    'Q3 45 TFSI Premium Plus': {'horsepower': 200, 'seats': 5, 'cargo_cu_ft': 16.7},
                    'Q3 45 TFSI Prestige': {'horsepower': 200, 'seats': 5, 'cargo_cu_ft': 16.7}
                }
            }
        },
        'Q5': {
            'default_specs': {'horsepower': 261, 'seats': 5, 'cargo_cu_ft': 25.8},
            'years': {
                (2018, 2026): {
                    'Q5 45 TFSI Premium': {'horsepower': 261, 'seats': 5, 'cargo_cu_ft': 25.8},
                    'Q5 45 TFSI Premium Plus': {'horsepower': 261, 'seats': 5, 'cargo_cu_ft': 25.8},
                    'Q5 45 TFSI Prestige': {'horsepower': 261, 'seats': 5, 'cargo_cu_ft': 25.8},
                    'SQ5': {'horsepower': 349, 'seats': 5, 'cargo_cu_ft': 25.8}
                },
                (2009, 2017): {
                    'Q5 45 TFSI Premium': {'horsepower': 220, 'seats': 5, 'cargo_cu_ft': 29.1},
                    'Q5 45 TFSI Premium Plus': {'horsepower': 220, 'seats': 5, 'cargo_cu_ft': 29.1},
                    'Q5 45 TFSI Prestige': {'horsepower': 220, 'seats': 5, 'cargo_cu_ft': 29.1},
                    'SQ5': {'horsepower': 354, 'seats': 5, 'cargo_cu_ft': 29.1}
                }
            }
        },
        'Q5 Sportback': {
            'default_specs': {'horsepower': 261, 'seats': 5, 'cargo_cu_ft': 21.8},
            'years': {
                (2021, 2026): {
                    'Q5 Sportback 45 TFSI Premium': {'horsepower': 261, 'seats': 5, 'cargo_cu_ft': 21.8},
                    'Q5 Sportback 45 TFSI Premium Plus': {'horsepower': 261, 'seats': 5, 'cargo_cu_ft': 21.8},
                    'Q5 Sportback 45 TFSI Prestige': {'horsepower': 261, 'seats': 5, 'cargo_cu_ft': 21.8},
                    'SQ5 Sportback': {'horsepower': 349, 'seats': 5, 'cargo_cu_ft': 21.8}
                }
            }
        },
        'Q7': {
            'default_specs': {'horsepower': 261, 'seats': 7, 'cargo_cu_ft': 14.2},
            'years': {
                (2017, 2026): {
                    'Q7 45 TFSI Premium': {'horsepower': 261, 'seats': 7, 'cargo_cu_ft': 14.2},
                    'Q7 45 TFSI Premium Plus': {'horsepower': 261, 'seats': 7, 'cargo_cu_ft': 14.2},
                    'Q7 45 TFSI Prestige': {'horsepower': 261, 'seats': 7, 'cargo_cu_ft': 14.2},
                    'Q7 55 TFSI Premium Plus': {'horsepower': 335, 'seats': 7, 'cargo_cu_ft': 14.2},
                    'Q7 55 TFSI Prestige': {'horsepower': 335, 'seats': 7, 'cargo_cu_ft': 14.2}
                },
                (2007, 2016): {
                    'Q7 45 TFSI Premium': {'horsepower': 252, 'seats': 7, 'cargo_cu_ft': 14.8},
                    'Q7 45 TFSI Premium Plus': {'horsepower': 252, 'seats': 7, 'cargo_cu_ft': 14.8},
                    'Q7 45 TFSI Prestige': {'horsepower': 252, 'seats': 7, 'cargo_cu_ft': 14.8},
                    'Q7 55 TFSI Premium Plus': {'horsepower': 333, 'seats': 7, 'cargo_cu_ft': 14.8},
                    'Q7 55 TFSI Prestige': {'horsepower': 333, 'seats': 7, 'cargo_cu_ft': 14.8}
                }
            }
        },
        'Q8': {
            'default_specs': {'horsepower': 335, 'seats': 5, 'cargo_cu_ft': 30.5},
            'years': {
                (2019, 2026): {
                    'Q8 55 TFSI Premium Plus': {'horsepower': 335, 'seats': 5, 'cargo_cu_ft': 30.5},
                    'Q8 55 TFSI Prestige': {'horsepower': 335, 'seats': 5, 'cargo_cu_ft': 30.5},
                    'SQ8': {'horsepower': 500, 'seats': 5, 'cargo_cu_ft': 30.5}
                }
            }
        },
        'RS7': {
            'default_specs': {'horsepower': 591, 'seats': 5, 'cargo_cu_ft': 19.6},
            'years': {
                (2014, 2026): {
                    'RS7': {'horsepower': 591, 'seats': 5, 'cargo_cu_ft': 19.6}
                }
            }
        },
        'S4': {
            'default_specs': {'horsepower': 349, 'seats': 5, 'cargo_cu_ft': 12.4},
            'years': {
                (2000, 2026): {
                    'S4': {'horsepower': 349, 'seats': 5, 'cargo_cu_ft': 12.4}
                }
            }
        },
        'S5': {
            'default_specs': {'horsepower': 349, 'seats': 4, 'cargo_cu_ft': 12.6},
            'years': {
                (2008, 2026): {
                    'S5 Coupe': {'horsepower': 349, 'seats': 4, 'cargo_cu_ft': 12.6},
                    'S5 Sportback': {'horsepower': 349, 'seats': 5, 'cargo_cu_ft': 21.8}
                }
            }
        },
        'e-tron': {
            'default_specs': {'horsepower': 355, 'seats': 5, 'cargo_cu_ft': 28.5},
            'years': {
                (2019, 2026): {
                    'e-tron 55 Premium': {'horsepower': 355, 'seats': 5, 'cargo_cu_ft': 28.5},
                    'e-tron 55 Premium Plus': {'horsepower': 355, 'seats': 5, 'cargo_cu_ft': 28.5},
                    'e-tron 55 Prestige': {'horsepower': 355, 'seats': 5, 'cargo_cu_ft': 28.5}
                }
            }
        }
    },
    'BMW': {
        '3 Series': {
            'default_specs': {'horsepower': 255, 'seats': 5, 'cargo_cu_ft': 13.0},
            'years': {
                (2019, 2026): {
                    '330i': {'horsepower': 255, 'seats': 5, 'cargo_cu_ft': 13.0},
                    '330i xDrive': {'horsepower': 255, 'seats': 5, 'cargo_cu_ft': 13.0},
                    'M340i': {'horsepower': 382, 'seats': 5, 'cargo_cu_ft': 13.0},
                    'M340i xDrive': {'horsepower': 382, 'seats': 5, 'cargo_cu_ft': 13.0},
                    'M3': {'horsepower': 473, 'seats': 5, 'cargo_cu_ft': 13.0},
                    'M3 Competition': {'horsepower': 503, 'seats': 5, 'cargo_cu_ft': 13.0}
                },
                (2000, 2018): {
                    '330i': {'horsepower': 248, 'seats': 5, 'cargo_cu_ft': 13.0},
                    '330i xDrive': {'horsepower': 248, 'seats': 5, 'cargo_cu_ft': 13.0},
                    'M340i': {'horsepower': 320, 'seats': 5, 'cargo_cu_ft': 13.0},
                    'M340i xDrive': {'horsepower': 320, 'seats': 5, 'cargo_cu_ft': 13.0},
                    'M3': {'horsepower': 425, 'seats': 5, 'cargo_cu_ft': 13.0},
                    'M3 Competition': {'horsepower': 444, 'seats': 5, 'cargo_cu_ft': 13.0}
                }
            }
        },
        '328i': {
            'default_specs': {'horsepower': 240, 'seats': 5, 'cargo_cu_ft': 13.0},
            'years': {
                (2007, 2015): {
                    '328i': {'horsepower': 240, 'seats': 5, 'cargo_cu_ft': 13.0},
                    '328i xDrive': {'horsepower': 240, 'seats': 5, 'cargo_cu_ft': 13.0}
                }
            }
        },
        '330i': {
            'default_specs': {'horsepower': 255, 'seats': 5, 'cargo_cu_ft': 13.0},
            'years': {
                (2016, 2026): {
                    '330i': {'horsepower': 255, 'seats': 5, 'cargo_cu_ft': 13.0},
                    '330i xDrive': {'horsepower': 255, 'seats': 5, 'cargo_cu_ft': 13.0}
                }
            }
        },
        '340i': {
            'default_specs': {'horsepower': 320, 'seats': 5, 'cargo_cu_ft': 13.0},
            'years': {
                (2016, 2018): {
                    '340i': {'horsepower': 320, 'seats': 5, 'cargo_cu_ft': 13.0},
                    '340i xDrive': {'horsepower': 320, 'seats': 5, 'cargo_cu_ft': 13.0}
                }
            }
        },
        '530i': {
            'default_specs': {'horsepower': 248, 'seats': 5, 'cargo_cu_ft': 18.7},
            'years': {
                (2017, 2026): {
                    '530i': {'horsepower': 248, 'seats': 5, 'cargo_cu_ft': 18.7},
                    '530i xDrive': {'horsepower': 248, 'seats': 5, 'cargo_cu_ft': 18.7}
                }
            }
        },
        '540i': {
            'default_specs': {'horsepower': 335, 'seats': 5, 'cargo_cu_ft': 18.7},
            'years': {
                (2017, 2026): {
                    '540i': {'horsepower': 335, 'seats': 5, 'cargo_cu_ft': 18.7},
                    '540i xDrive': {'horsepower': 335, 'seats': 5, 'cargo_cu_ft': 18.7}
                }
            }
        },
        '750i': {
            'default_specs': {'horsepower': 375, 'seats': 5, 'cargo_cu_ft': 18.0},
            'years': {
                (2023, 2026): {
                    '750i': {'horsepower': 375, 'seats': 5, 'cargo_cu_ft': 18.0},
                    '750i xDrive': {'horsepower': 375, 'seats': 5, 'cargo_cu_ft': 18.0},
                    '750Li xDrive': {'horsepower': 375, 'seats': 5, 'cargo_cu_ft': 18.0}
                },
                (2009, 2022): {
                    '750i': {'horsepower': 445, 'seats': 5, 'cargo_cu_ft': 18.0},
                    '750i xDrive': {'horsepower': 445, 'seats': 5, 'cargo_cu_ft': 18.0},
                    '750Li xDrive': {'horsepower': 445, 'seats': 5, 'cargo_cu_ft': 18.0}
                }
            }
        },
        'M3': {
            'default_specs': {'horsepower': 473, 'seats': 5, 'cargo_cu_ft': 13.0},
            'years': {
                (2021, 2026): {
                    'M3': {'horsepower': 473, 'seats': 5, 'cargo_cu_ft': 13.0},
                    'M3 Competition': {'horsepower': 503, 'seats': 5, 'cargo_cu_ft': 13.0}
                },
                (2000, 2020): {
                    'M3': {'horsepower': 425, 'seats': 5, 'cargo_cu_ft': 13.0},
                    'M3 Competition': {'horsepower': 444, 'seats': 5, 'cargo_cu_ft': 13.0}
                }
            }
        },
        'M4': {
            'default_specs': {'horsepower': 473, 'seats': 4, 'cargo_cu_ft': 12.4},
            'years': {
                (2021, 2026): {
                    'M4': {'horsepower': 473, 'seats': 4, 'cargo_cu_ft': 12.4},
                    'M4 Convertible': {'horsepower': 473, 'seats': 4, 'cargo_cu_ft': 9.8},
                    'M4 Competition': {'horsepower': 503, 'seats': 4, 'cargo_cu_ft': 12.4}
                },
                (2014, 2020): {
                    'M4': {'horsepower': 425, 'seats': 4, 'cargo_cu_ft': 11.1},
                    'M4 Convertible': {'horsepower': 425, 'seats': 4, 'cargo_cu_ft': 9.8},
                    'M4 Competition': {'horsepower': 444, 'seats': 4, 'cargo_cu_ft': 11.1}
                }
            }
        },
        'M5': {
            'default_specs': {'horsepower': 600, 'seats': 5, 'cargo_cu_ft': 18.7},
            'years': {
                (2018, 2026): {
                    'M5': {'horsepower': 600, 'seats': 5, 'cargo_cu_ft': 18.7},
                    'M5 Competition': {'horsepower': 617, 'seats': 5, 'cargo_cu_ft': 18.7}
                },
                (2000, 2017): {
                    'M5': {'horsepower': 560, 'seats': 5, 'cargo_cu_ft': 14.0},
                    'M5 Competition': {'horsepower': 575, 'seats': 5, 'cargo_cu_ft': 14.0}
                }
            }
        },
        'M8': {
            'default_specs': {'horsepower': 600, 'seats': 4, 'cargo_cu_ft': 12.4},
            'years': {
                (2020, 2026): {
                    'M8 Coupe': {'horsepower': 600, 'seats': 4, 'cargo_cu_ft': 12.4},
                    'M8 Convertible': {'horsepower': 600, 'seats': 4, 'cargo_cu_ft': 8.0},
                    'M8 Gran Coupe': {'horsepower': 600, 'seats': 5, 'cargo_cu_ft': 15.5},
                    'M8 Competition Coupe': {'horsepower': 617, 'seats': 4, 'cargo_cu_ft': 12.4},
                    'M8 Competition Convertible': {'horsepower': 617, 'seats': 4, 'cargo_cu_ft': 8.0},
                    'M8 Competition Gran Coupe': {'horsepower': 617, 'seats': 5, 'cargo_cu_ft': 15.5}
                }
            }
        },
        'X1': {
            'default_specs': {'horsepower': 241, 'seats': 5, 'cargo_cu_ft': 27.7},
            'years': {
                (2023, 2026): {
                    'X1 sDrive28i': {'horsepower': 241, 'seats': 5, 'cargo_cu_ft': 27.7},
                    'X1 xDrive28i': {'horsepower': 241, 'seats': 5, 'cargo_cu_ft': 27.7}
                },
                (2013, 2022): {
                    'X1 sDrive28i': {'horsepower': 228, 'seats': 5, 'cargo_cu_ft': 27.1},
                    'X1 xDrive28i': {'horsepower': 228, 'seats': 5, 'cargo_cu_ft': 27.1}
                }
            }
        },
        'X3': {
            'default_specs': {'horsepower': 248, 'seats': 5, 'cargo_cu_ft': 28.7},
            'years': {
                (2025, 2026): {
                    'X3 30 xDrive': {'horsepower': 295, 'seats': 5, 'cargo_cu_ft': 29.7},
                    'X3 M50 xDrive': {'horsepower': 393, 'seats': 5, 'cargo_cu_ft': 29.7}
                },
                (2018, 2024): {
                    'X3 30 xDrive': {'horsepower': 248, 'seats': 5, 'cargo_cu_ft': 28.7},
                    'X3 M50 xDrive': {'horsepower': 382, 'seats': 5, 'cargo_cu_ft': 28.7}
                },
                (2004, 2017): {
                    'X3 30 xDrive': {'horsepower': 240, 'seats': 5, 'cargo_cu_ft': 27.6},
                    'X3 M50 xDrive': {'horsepower': 300, 'seats': 5, 'cargo_cu_ft': 27.6}
                }
            }
        },
        'X5': {
            'default_specs': {'horsepower': 335, 'seats': 5, 'cargo_cu_ft': 33.9},
            'years': {
                (2019, 2026): {
                    'sDrive40i': {'horsepower': 335, 'seats': 5, 'cargo_cu_ft': 33.9},
                    'xDrive40i': {'horsepower': 335, 'seats': 5, 'cargo_cu_ft': 33.9},
                    'xDrive50i': {'horsepower': 456, 'seats': 5, 'cargo_cu_ft': 33.9},
                    'M50i': {'horsepower': 523, 'seats': 5, 'cargo_cu_ft': 33.9},
                    'X5 M': {'horsepower': 600, 'seats': 5, 'cargo_cu_ft': 33.9},
                    'X5 M Competition': {'horsepower': 617, 'seats': 5, 'cargo_cu_ft': 33.9}
                },
                (2000, 2018): {
                    'sDrive40i': {'horsepower': 300, 'seats': 5, 'cargo_cu_ft': 33.9},
                    'xDrive40i': {'horsepower': 300, 'seats': 5, 'cargo_cu_ft': 33.9},
                    'xDrive50i': {'horsepower': 445, 'seats': 5, 'cargo_cu_ft': 33.9},
                    'M50i': {'horsepower': 456, 'seats': 5, 'cargo_cu_ft': 33.9},
                    'X5 M': {'horsepower': 567, 'seats': 5, 'cargo_cu_ft': 33.9},
                    'X5 M Competition': {'horsepower': 600, 'seats': 5, 'cargo_cu_ft': 33.9}
                }
            }
        },
        'X7': {
            'default_specs': {'horsepower': 375, 'seats': 7, 'cargo_cu_ft': 16.3},
            'years': {
                (2019, 2026): {
                    'xDrive40i': {'horsepower': 375, 'seats': 7, 'cargo_cu_ft': 16.3},
                    'xDrive50i': {'horsepower': 456, 'seats': 7, 'cargo_cu_ft': 16.3},
                    'M50i': {'horsepower': 523, 'seats': 7, 'cargo_cu_ft': 16.3},
                    'M60i': {'horsepower': 523, 'seats': 7, 'cargo_cu_ft': 16.3}
                }
            }
        },
        'i3': {
            'default_specs': {'horsepower': 170, 'seats': 4, 'cargo_cu_ft': 15.1},
            'years': {
                (2014, 2022): {
                    'i3': {'horsepower': 170, 'seats': 4, 'cargo_cu_ft': 15.1},
                    'i3s': {'horsepower': 181, 'seats': 4, 'cargo_cu_ft': 15.1}
                }
            }
        },
        'i4': {
            'default_specs': {'horsepower': 335, 'seats': 5, 'cargo_cu_ft': 14.8},
            'years': {
                (2021, 2026): {
                    'i4 eDrive40': {'horsepower': 335, 'seats': 5, 'cargo_cu_ft': 14.8},
                    'i4 M50': {'horsepower': 536, 'seats': 5, 'cargo_cu_ft': 14.8}
                }
            }
        },
        'iX': {
            'default_specs': {'horsepower': 516, 'seats': 5, 'cargo_cu_ft': 35.5},
            'years': {
                (2022, 2026): {
                    'iX xDrive50': {'horsepower': 516, 'seats': 5, 'cargo_cu_ft': 35.5},
                    'iX M60': {'horsepower': 610, 'seats': 5, 'cargo_cu_ft': 35.5}
                }
            }
        },
        'iX3': {
            'default_specs': {'horsepower': 281, 'seats': 5, 'cargo_cu_ft': 29.7},
            'years': {
                (2026, 2026): {
                    'iX3 eDrive35': {'horsepower': 281, 'seats': 5, 'cargo_cu_ft': 29.7},
                    'iX3 xDrive50': {'horsepower': 398, 'seats': 5, 'cargo_cu_ft': 29.7},
                    'iX3 M50': {'horsepower': 398, 'seats': 5, 'cargo_cu_ft': 29.7}
                }
            }
        }
    },
    'Buick': {
        'Enclave': {
            'default_specs': {'horsepower': 310, 'seats': 7, 'cargo_cu_ft': 23.6},
            'years': {
                (2018, 2026): {
                    'Enclave Essence': {'horsepower': 310, 'seats': 7, 'cargo_cu_ft': 23.6},
                    'Enclave Premium': {'horsepower': 310, 'seats': 7, 'cargo_cu_ft': 23.6},
                    'Enclave Avenir': {'horsepower': 310, 'seats': 7, 'cargo_cu_ft': 23.6}
                },
                (2008, 2017): {
                    'Enclave Essence': {'horsepower': 288, 'seats': 8, 'cargo_cu_ft': 23.3},
                    'Enclave Premium': {'horsepower': 288, 'seats': 8, 'cargo_cu_ft': 23.3},
                    'Enclave Avenir': {'horsepower': 288, 'seats': 8, 'cargo_cu_ft': 23.3}
                }
            }
        },
        'Encore': {
            'default_specs': {'horsepower': 155, 'seats': 5, 'cargo_cu_ft': 18.8},
            'years': {
                (2013, 2022): {
                    'Encore Preferred': {'horsepower': 155, 'seats': 5, 'cargo_cu_ft': 18.8},
                    'Encore Sport Touring': {'horsepower': 155, 'seats': 5, 'cargo_cu_ft': 18.8},
                    'Encore Essence': {'horsepower': 155, 'seats': 5, 'cargo_cu_ft': 18.8}
                }
            }
        },
        'Encore GX': {
            'default_specs': {'horsepower': 137, 'seats': 5, 'cargo_cu_ft': 23.5},
            'years': {
                (2020, 2026): {
                    'Encore GX Preferred': {'horsepower': 137, 'seats': 5, 'cargo_cu_ft': 23.5},
                    'Encore GX Select': {'horsepower': 155, 'seats': 5, 'cargo_cu_ft': 23.5},
                    'Encore GX Essence': {'horsepower': 155, 'seats': 5, 'cargo_cu_ft': 23.5}
                }
            }
        },
        'Envision': {
            'default_specs': {'horsepower': 228, 'seats': 5, 'cargo_cu_ft': 25.2},
            'years': {
                (2021, 2026): {
                    'Envision Preferred': {'horsepower': 228, 'seats': 5, 'cargo_cu_ft': 25.2},
                    'Envision Essence': {'horsepower': 228, 'seats': 5, 'cargo_cu_ft': 25.2},
                    'Envision Premium': {'horsepower': 228, 'seats': 5, 'cargo_cu_ft': 25.2},
                    'Envision Avenir': {'horsepower': 228, 'seats': 5, 'cargo_cu_ft': 25.2}
                },
                (2016, 2020): {
                    'Envision Preferred': {'horsepower': 252, 'seats': 5, 'cargo_cu_ft': 26.9},
                    'Envision Essence': {'horsepower': 252, 'seats': 5, 'cargo_cu_ft': 26.9},
                    'Envision Premium': {'horsepower': 252, 'seats': 5, 'cargo_cu_ft': 26.9},
                    'Envision Avenir': {'horsepower': 252, 'seats': 5, 'cargo_cu_ft': 26.9}
                }
            }
        },
        'LaCrosse': {
            'default_specs': {'horsepower': 310, 'seats': 5, 'cargo_cu_ft': 15.0},
            'years': {
                (2005, 2019): {
                    'LaCrosse': {'horsepower': 310, 'seats': 5, 'cargo_cu_ft': 15.0},
                    'LaCrosse Essence': {'horsepower': 310, 'seats': 5, 'cargo_cu_ft': 15.0},
                    'LaCrosse Premium': {'horsepower': 310, 'seats': 5, 'cargo_cu_ft': 15.0},
                    'LaCrosse Sport Touring': {'horsepower': 310, 'seats': 5, 'cargo_cu_ft': 15.0}
                }
            }
        },
        'Regal': {
            'default_specs': {'horsepower': 250, 'seats': 5, 'cargo_cu_ft': 31.5},
            'years': {
                (2011, 2020): {
                    'Regal Sportback Preferred': {'horsepower': 250, 'seats': 5, 'cargo_cu_ft': 31.5},
                    'Regal Sportback Essence': {'horsepower': 250, 'seats': 5, 'cargo_cu_ft': 31.5},
                    'Regal Sportback GS': {'horsepower': 310, 'seats': 5, 'cargo_cu_ft': 31.5},
                    'Regal TourX Preferred': {'horsepower': 250, 'seats': 5, 'cargo_cu_ft': 32.7},
                    'Regal TourX Essence': {'horsepower': 250, 'seats': 5, 'cargo_cu_ft': 32.7},
                    'Regal TourX GS': {'horsepower': 310, 'seats': 5, 'cargo_cu_ft': 32.7}
                }
            }
        }
    },
    'Cadillac': {
        'ATS': {
            'default_specs': {'horsepower': 272, 'seats': 5, 'cargo_cu_ft': 10.4},
            'years': {
                (2013, 2019): {
                    'ATS 2.0L Turbo': {'horsepower': 272, 'seats': 5, 'cargo_cu_ft': 10.4},
                    'ATS 2.0L Turbo Luxury': {'horsepower': 272, 'seats': 5, 'cargo_cu_ft': 10.4},
                    'ATS 2.0L Turbo Premium': {'horsepower': 272, 'seats': 5, 'cargo_cu_ft': 10.4},
                    'ATS 3.6L Premium Performance': {'horsepower': 335, 'seats': 5, 'cargo_cu_ft': 10.4},
                    'ATS-V Sedan': {'horsepower': 464, 'seats': 5, 'cargo_cu_ft': 10.4},
                    'ATS-V Coupe': {'horsepower': 464, 'seats': 4, 'cargo_cu_ft': 10.4}
                }
            }
        },
        'CT4': {
            'default_specs': {'horsepower': 237, 'seats': 5, 'cargo_cu_ft': 10.7},
            'years': {
                (2020, 2026): {
                    'CT4 Luxury': {'horsepower': 237, 'seats': 5, 'cargo_cu_ft': 10.7},
                    'CT4 Premium Luxury': {'horsepower': 237, 'seats': 5, 'cargo_cu_ft': 10.7},
                    'CT4 Sport': {'horsepower': 237, 'seats': 5, 'cargo_cu_ft': 10.7},
                    'CT4-V': {'horsepower': 325, 'seats': 5, 'cargo_cu_ft': 10.7},
                    'CT4-V Blackwing': {'horsepower': 472, 'seats': 5, 'cargo_cu_ft': 10.7}
                }
            }
        },
        'CT5': {
            'default_specs': {'horsepower': 237, 'seats': 5, 'cargo_cu_ft': 11.9},
            'years': {
                (2020, 2026): {
                    'CT5 Luxury': {'horsepower': 237, 'seats': 5, 'cargo_cu_ft': 11.9},
                    'CT5 Premium Luxury': {'horsepower': 237, 'seats': 5, 'cargo_cu_ft': 11.9},
                    'CT5 Sport': {'horsepower': 237, 'seats': 5, 'cargo_cu_ft': 11.9},
                    'CT5-V': {'horsepower': 360, 'seats': 5, 'cargo_cu_ft': 11.9},
                    'CT5-V Blackwing': {'horsepower': 668, 'seats': 5, 'cargo_cu_ft': 11.9}
                }
            }
        },
        'CTS': {
            'default_specs': {'horsepower': 268, 'seats': 5, 'cargo_cu_ft': 13.7},
            'years': {
                (2003, 2019): {
                    'CTS 2.0L Turbo': {'horsepower': 268, 'seats': 5, 'cargo_cu_ft': 13.7},
                    'CTS 2.0L Turbo Luxury': {'horsepower': 268, 'seats': 5, 'cargo_cu_ft': 13.7},
                    'CTS 2.0L Turbo Performance': {'horsepower': 268, 'seats': 5, 'cargo_cu_ft': 13.7},
                    'CTS 2.0L Turbo Premium': {'horsepower': 268, 'seats': 5, 'cargo_cu_ft': 13.7},
                    'CTS 3.6L Twin Turbo': {'horsepower': 420, 'seats': 5, 'cargo_cu_ft': 13.7},
                    'CTS-V': {'horsepower': 640, 'seats': 5, 'cargo_cu_ft': 13.7}
                }
            }
        },
        'Escalade': {
            'default_specs': {'horsepower': 420, 'seats': 7, 'cargo_cu_ft': 25.5},
            'years': {
                (2021, 2026): {
                    'Escalade Luxury': {'horsepower': 420, 'seats': 7, 'cargo_cu_ft': 25.5},
                    'Escalade Premium Luxury': {'horsepower': 420, 'seats': 7, 'cargo_cu_ft': 25.5},
                    'Escalade Sport': {'horsepower': 420, 'seats': 7, 'cargo_cu_ft': 25.5},
                    'Escalade Platinum': {'horsepower': 420, 'seats': 7, 'cargo_cu_ft': 25.5},
                    'Escalade ESV Luxury': {'horsepower': 420, 'seats': 8, 'cargo_cu_ft': 42.9},
                    'Escalade ESV Premium Luxury': {'horsepower': 420, 'seats': 8, 'cargo_cu_ft': 42.9},
                    'Escalade ESV Sport': {'horsepower': 420, 'seats': 8, 'cargo_cu_ft': 42.9},
                    'Escalade ESV Platinum': {'horsepower': 420, 'seats': 8, 'cargo_cu_ft': 42.9},
                    'Escalade-V': {'horsepower': 682, 'seats': 7, 'cargo_cu_ft': 25.5}
                },
                (1999, 2020): {
                    'Escalade Luxury': {'horsepower': 420, 'seats': 7, 'cargo_cu_ft': 15.2},
                    'Escalade Premium Luxury': {'horsepower': 420, 'seats': 7, 'cargo_cu_ft': 15.2},
                    'Escalade Sport': {'horsepower': 420, 'seats': 7, 'cargo_cu_ft': 15.2},
                    'Escalade Platinum': {'horsepower': 420, 'seats': 7, 'cargo_cu_ft': 15.2},
                    'Escalade ESV Luxury': {'horsepower': 420, 'seats': 8, 'cargo_cu_ft': 39.3},
                    'Escalade ESV Premium Luxury': {'horsepower': 420, 'seats': 8, 'cargo_cu_ft': 39.3},
                    'Escalade ESV Sport': {'horsepower': 420, 'seats': 8, 'cargo_cu_ft': 39.3},
                    'Escalade ESV Platinum': {'horsepower': 420, 'seats': 8, 'cargo_cu_ft': 39.3}
                }
            }
        },
        'SRX': {
            'default_specs': {'horsepower': 308, 'seats': 5, 'cargo_cu_ft': 29.9},
            'years': {
                (2004, 2016): {
                    'SRX Luxury Collection': {'horsepower': 308, 'seats': 5, 'cargo_cu_ft': 29.9},
                    'SRX Performance Collection': {'horsepower': 308, 'seats': 5, 'cargo_cu_ft': 29.9},
                    'SRX Premium Collection': {'horsepower': 308, 'seats': 5, 'cargo_cu_ft': 29.9},
                    'SRX Platinum Collection': {'horsepower': 308, 'seats': 5, 'cargo_cu_ft': 29.9}
                }
            }
        },
        'XT4': {
            'default_specs': {'horsepower': 235, 'seats': 5, 'cargo_cu_ft': 22.5},
            'years': {
                (2019, 2026): {
                    'XT4 Luxury': {'horsepower': 235, 'seats': 5, 'cargo_cu_ft': 22.5},
                    'XT4 Premium Luxury': {'horsepower': 235, 'seats': 5, 'cargo_cu_ft': 22.5},
                    'XT4 Sport': {'horsepower': 235, 'seats': 5, 'cargo_cu_ft': 22.5}
                }
            }
        },
        'XT5': {
            'default_specs': {'horsepower': 310, 'seats': 5, 'cargo_cu_ft': 30.0},
            'years': {
                (2017, 2026): {
                    'XT5 Luxury': {'horsepower': 310, 'seats': 5, 'cargo_cu_ft': 30.0},
                    'XT5 Premium Luxury': {'horsepower': 310, 'seats': 5, 'cargo_cu_ft': 30.0},
                    'XT5 Sport': {'horsepower': 310, 'seats': 5, 'cargo_cu_ft': 30.0}
                }
            }
        },
        'XT6': {
            'default_specs': {'horsepower': 310, 'seats': 7, 'cargo_cu_ft': 12.6},
            'years': {
                (2020, 2026): {
                    'XT6 Luxury': {'horsepower': 310, 'seats': 7, 'cargo_cu_ft': 12.6},
                    'XT6 Premium Luxury': {'horsepower': 310, 'seats': 7, 'cargo_cu_ft': 12.6},
                    'XT6 Sport': {'horsepower': 310, 'seats': 7, 'cargo_cu_ft': 12.6},
                    'XT6 Platinum': {'horsepower': 310, 'seats': 6, 'cargo_cu_ft': 12.6}
                }
            }
        }
    },
    'Chevrolet': {
        'Blazer': {
            'default_specs': {'horsepower': 228, 'seats': 5, 'cargo_cu_ft': 30.5},
            'years': {
                (2019, 2026): {
                    'Blazer 1LT': {'horsepower': 228, 'seats': 5, 'cargo_cu_ft': 30.5},
                    'Blazer 2LT': {'horsepower': 228, 'seats': 5, 'cargo_cu_ft': 30.5},
                    'Blazer 3LT': {'horsepower': 308, 'seats': 5, 'cargo_cu_ft': 30.5},
                    'Blazer Premier': {'horsepower': 308, 'seats': 5, 'cargo_cu_ft': 30.5},
                    'Blazer RS': {'horsepower': 308, 'seats': 5, 'cargo_cu_ft': 30.5}
                }
            }
        },
        'Camaro': {
            'default_specs': {'horsepower': 275, 'seats': 4, 'cargo_cu_ft': 9.1},
            'years': {
                (2016, 2026): {
                    'Camaro 1LT': {'horsepower': 275, 'seats': 4, 'cargo_cu_ft': 9.1},
                    'Camaro 2LT': {'horsepower': 275, 'seats': 4, 'cargo_cu_ft': 9.1},
                    'Camaro 1SS': {'horsepower': 455, 'seats': 4, 'cargo_cu_ft': 9.1},
                    'Camaro 2SS': {'horsepower': 455, 'seats': 4, 'cargo_cu_ft': 9.1},
                    'Camaro ZL1': {'horsepower': 650, 'seats': 4, 'cargo_cu_ft': 9.1},
                    'Camaro ZL1 1LE': {'horsepower': 650, 'seats': 4, 'cargo_cu_ft': 9.1}
                },
                (2010, 2015): {
                    'Camaro 1LT': {'horsepower': 323, 'seats': 4, 'cargo_cu_ft': 11.3},
                    'Camaro 2LT': {'horsepower': 323, 'seats': 4, 'cargo_cu_ft': 11.3},
                    'Camaro 1SS': {'horsepower': 426, 'seats': 4, 'cargo_cu_ft': 11.3},
                    'Camaro 2SS': {'horsepower': 426, 'seats': 4, 'cargo_cu_ft': 11.3},
                    'Camaro ZL1': {'horsepower': 580, 'seats': 4, 'cargo_cu_ft': 11.3},
                    'Camaro ZL1 1LE': {'horsepower': 580, 'seats': 4, 'cargo_cu_ft': 11.3}
                }
            }
        },
        'Colorado': {
            'default_specs': {'horsepower': 200, 'seats': 5, 'cargo_cu_ft': 50.5},
            'years': {
                (2023, 2026): {
                    'Colorado Work Truck': {'horsepower': 237, 'seats': 5, 'cargo_cu_ft': 50.5},
                    'Colorado LT': {'horsepower': 237, 'seats': 5, 'cargo_cu_ft': 50.5},
                    'Colorado Z71': {'horsepower': 237, 'seats': 5, 'cargo_cu_ft': 50.5},
                    'Colorado Trail Boss': {'horsepower': 237, 'seats': 5, 'cargo_cu_ft': 50.5},
                    'Colorado ZR2': {'horsepower': 310, 'seats': 5, 'cargo_cu_ft': 50.5}
                },
                (2004, 2022): {
                    'Colorado Work Truck': {'horsepower': 200, 'seats': 5, 'cargo_cu_ft': 49.9},
                    'Colorado LT': {'horsepower': 200, 'seats': 5, 'cargo_cu_ft': 49.9},
                    'Colorado Z71': {'horsepower': 308, 'seats': 5, 'cargo_cu_ft': 49.9},
                    'Colorado Trail Boss': {'horsepower': 308, 'seats': 5, 'cargo_cu_ft': 49.9},
                    'Colorado ZR2': {'horsepower': 308, 'seats': 5, 'cargo_cu_ft': 49.9}
                }
            }
        },
        'Corvette': {
            'default_specs': {'horsepower': 490, 'seats': 2, 'cargo_cu_ft': 12.6},
            'years': {
                (2020, 2026): {
                    'Corvette Stingray': {'horsepower': 490, 'seats': 2, 'cargo_cu_ft': 12.6},
                    'Corvette Stingray Z51': {'horsepower': 495, 'seats': 2, 'cargo_cu_ft': 12.6},
                    'Corvette Stingray Convertible': {'horsepower': 490, 'seats': 2, 'cargo_cu_ft': 12.6},
                    'Corvette Stingray Convertible Z51': {'horsepower': 495, 'seats': 2, 'cargo_cu_ft': 12.6},
                    'Corvette Z06': {'horsepower': 670, 'seats': 2, 'cargo_cu_ft': 12.6},
                    'Corvette Z06 Convertible': {'horsepower': 670, 'seats': 2, 'cargo_cu_ft': 12.6},
                    'Corvette E-Ray': {'horsepower': 655, 'seats': 2, 'cargo_cu_ft': 12.6},
                    'Corvette ZR1': {'horsepower': 1004, 'seats': 2, 'cargo_cu_ft': 12.6}
                },
                (1953, 2019): {
                    'Corvette Stingray': {'horsepower': 455, 'seats': 2, 'cargo_cu_ft': 15.0},
                    'Corvette Stingray Z51': {'horsepower': 460, 'seats': 2, 'cargo_cu_ft': 15.0},
                    'Corvette Z06': {'horsepower': 650, 'seats': 2, 'cargo_cu_ft': 15.0},
                    'Corvette ZR1': {'horsepower': 755, 'seats': 2, 'cargo_cu_ft': 15.0}
                }
            }
        },
        'Cruze': {
            'default_specs': {'horsepower': 153, 'seats': 5, 'cargo_cu_ft': 13.7},
            'years': {
                (2011, 2019): {
                    'Cruze L': {'horsepower': 153, 'seats': 5, 'cargo_cu_ft': 13.7},
                    'Cruze LS': {'horsepower': 153, 'seats': 5, 'cargo_cu_ft': 13.7},
                    'Cruze LT': {'horsepower': 153, 'seats': 5, 'cargo_cu_ft': 13.7},
                    'Cruze Premier': {'horsepower': 153, 'seats': 5, 'cargo_cu_ft': 13.7},
                    'Cruze Diesel': {'horsepower': 137, 'seats': 5, 'cargo_cu_ft': 13.7}
                }
            }
        },
        'Equinox': {
            'default_specs': {'horsepower': 175, 'seats': 5, 'cargo_cu_ft': 29.9},
            'years': {
                (2018, 2026): {
                    'Equinox LT': {'horsepower': 175, 'seats': 5, 'cargo_cu_ft': 29.9},
                    'Equinox RS': {'horsepower': 175, 'seats': 5, 'cargo_cu_ft': 29.9},
                    'Equinox Premier': {'horsepower': 175, 'seats': 5, 'cargo_cu_ft': 29.9}
                },
                (2005, 2017): {
                    'Equinox LT': {'horsepower': 182, 'seats': 5, 'cargo_cu_ft': 31.5},
                    'Equinox RS': {'horsepower': 182, 'seats': 5, 'cargo_cu_ft': 31.5},
                    'Equinox Premier': {'horsepower': 182, 'seats': 5, 'cargo_cu_ft': 31.5}
                }
            }
        },
        'Impala': {
            'default_specs': {'horsepower': 305, 'seats': 5, 'cargo_cu_ft': 18.8},
            'years': {
                (2014, 2020): {
                    'Impala LS': {'horsepower': 305, 'seats': 5, 'cargo_cu_ft': 18.8},
                    'Impala LT': {'horsepower': 305, 'seats': 5, 'cargo_cu_ft': 18.8},
                    'Impala Premier': {'horsepower': 305, 'seats': 5, 'cargo_cu_ft': 18.8}
                },
                (2000, 2013): {
                    'Impala LS': {'horsepower': 211, 'seats': 5, 'cargo_cu_ft': 18.6},
                    'Impala LT': {'horsepower': 211, 'seats': 5, 'cargo_cu_ft': 18.6},
                    'Impala Premier': {'horsepower': 211, 'seats': 5, 'cargo_cu_ft': 18.6}
                }
            }
        },
        'Malibu': {
            'default_specs': {'horsepower': 160, 'seats': 5, 'cargo_cu_ft': 15.7},
            'years': {
                (2016, 2026): {
                    'Malibu LS': {'horsepower': 160, 'seats': 5, 'cargo_cu_ft': 15.7},
                    'Malibu LT': {'horsepower': 160, 'seats': 5, 'cargo_cu_ft': 15.7},
                    'Malibu Premier': {'horsepower': 250, 'seats': 5, 'cargo_cu_ft': 15.7},
                    'Malibu RS': {'horsepower': 160, 'seats': 5, 'cargo_cu_ft': 15.7}
                },
                (1997, 2015): {
                    'Malibu LS': {'horsepower': 196, 'seats': 5, 'cargo_cu_ft': 16.3},
                    'Malibu LT': {'horsepower': 196, 'seats': 5, 'cargo_cu_ft': 16.3},
                    'Malibu Premier': {'horsepower': 259, 'seats': 5, 'cargo_cu_ft': 16.3},
                    'Malibu RS': {'horsepower': 196, 'seats': 5, 'cargo_cu_ft': 16.3}
                }
            }
        },
        'Silverado': {
            'default_specs': {'horsepower': 355, 'seats': 6, 'cargo_cu_ft': 71.7},
            'years': {
                (2019, 2026): {
                    'Silverado Regular Cab Work Truck': {'horsepower': 310, 'seats': 3, 'cargo_cu_ft': 71.7},
                    'Silverado Double Cab LT': {'horsepower': 310, 'seats': 6, 'cargo_cu_ft': 71.7},
                    'Silverado Crew Cab LT': {'horsepower': 355, 'seats': 6, 'cargo_cu_ft': 71.7},
                    'Silverado Crew Cab LTZ': {'horsepower': 420, 'seats': 6, 'cargo_cu_ft': 71.7},
                    'Silverado High Country': {'horsepower': 420, 'seats': 6, 'cargo_cu_ft': 71.7}
                },
                (1999, 2018): {
                    'Silverado Regular Cab Work Truck': {'horsepower': 285, 'seats': 3, 'cargo_cu_ft': 71.7},
                    'Silverado Double Cab LT': {'horsepower': 355, 'seats': 6, 'cargo_cu_ft': 71.7},
                    'Silverado Crew Cab LT': {'horsepower': 355, 'seats': 6, 'cargo_cu_ft': 71.7},
                    'Silverado Crew Cab LTZ': {'horsepower': 355, 'seats': 6, 'cargo_cu_ft': 71.7},
                    'Silverado High Country': {'horsepower': 420, 'seats': 6, 'cargo_cu_ft': 71.7}
                }
            }
        },
        'Silverado 1500': {
            'default_specs': {'horsepower': 355, 'seats': 6, 'cargo_cu_ft': 71.7},
            'years': {
                (2019, 2026): {
                    'Silverado 1500 Regular Cab Work Truck': {'horsepower': 310, 'seats': 3, 'cargo_cu_ft': 71.7},
                    'Silverado 1500 Double Cab LT': {'horsepower': 310, 'seats': 6, 'cargo_cu_ft': 71.7},
                    'Silverado 1500 Crew Cab LT': {'horsepower': 355, 'seats': 6, 'cargo_cu_ft': 71.7},
                    'Silverado 1500 Crew Cab RST': {'horsepower': 355, 'seats': 6, 'cargo_cu_ft': 71.7},
                    'Silverado 1500 Crew Cab LTZ': {'horsepower': 420, 'seats': 6, 'cargo_cu_ft': 71.7},
                    'Silverado 1500 High Country': {'horsepower': 420, 'seats': 6, 'cargo_cu_ft': 71.7}
                }
            }
        },
        'Sonic': {
            'default_specs': {'horsepower': 138, 'seats': 5, 'cargo_cu_ft': 14.9},
            'years': {
                (2012, 2020): {
                    'Sonic LS': {'horsepower': 138, 'seats': 5, 'cargo_cu_ft': 14.9},
                    'Sonic LT': {'horsepower': 138, 'seats': 5, 'cargo_cu_ft': 14.9},
                    'Sonic Premier': {'horsepower': 138, 'seats': 5, 'cargo_cu_ft': 14.9},
                    'Sonic RS': {'horsepower': 138, 'seats': 5, 'cargo_cu_ft': 14.9}
                }
            }
        },
        'Spark': {
            'default_specs': {'horsepower': 98, 'seats': 4, 'cargo_cu_ft': 11.1},
            'years': {
                (2013, 2022): {
                    'Spark LS': {'horsepower': 98, 'seats': 4, 'cargo_cu_ft': 11.1},
                    'Spark LT': {'horsepower': 98, 'seats': 4, 'cargo_cu_ft': 11.1},
                    'Spark Premier': {'horsepower': 98, 'seats': 4, 'cargo_cu_ft': 11.1}
                }
            }
        },
        'Suburban': {
            'default_specs': {'horsepower': 355, 'seats': 8, 'cargo_cu_ft': 41.5},
            'years': {
                (2021, 2026): {
                    'Suburban LS': {'horsepower': 355, 'seats': 9, 'cargo_cu_ft': 41.5},
                    'Suburban LT': {'horsepower': 355, 'seats': 8, 'cargo_cu_ft': 41.5},
                    'Suburban RST': {'horsepower': 355, 'seats': 8, 'cargo_cu_ft': 41.5},
                    'Suburban Z71': {'horsepower': 355, 'seats': 8, 'cargo_cu_ft': 41.5},
                    'Suburban Premier': {'horsepower': 420, 'seats': 8, 'cargo_cu_ft': 41.5},
                    'Suburban High Country': {'horsepower': 420, 'seats': 8, 'cargo_cu_ft': 41.5}
                },
                (1967, 2020): {
                    'Suburban LS': {'horsepower': 355, 'seats': 9, 'cargo_cu_ft': 39.3},
                    'Suburban LT': {'horsepower': 355, 'seats': 8, 'cargo_cu_ft': 39.3},
                    'Suburban RST': {'horsepower': 355, 'seats': 8, 'cargo_cu_ft': 39.3},
                    'Suburban Z71': {'horsepower': 355, 'seats': 8, 'cargo_cu_ft': 39.3},
                    'Suburban Premier': {'horsepower': 355, 'seats': 8, 'cargo_cu_ft': 39.3},
                    'Suburban High Country': {'horsepower': 420, 'seats': 8, 'cargo_cu_ft': 39.3}
                }
            }
        },
        'Tahoe': {
            'default_specs': {'horsepower': 355, 'seats': 8, 'cargo_cu_ft': 25.5},
            'years': {
                (2021, 2026): {
                    'Tahoe LS': {'horsepower': 355, 'seats': 9, 'cargo_cu_ft': 25.5},
                    'Tahoe LT': {'horsepower': 355, 'seats': 8, 'cargo_cu_ft': 25.5},
                    'Tahoe RST': {'horsepower': 355, 'seats': 8, 'cargo_cu_ft': 25.5},
                    'Tahoe Z71': {'horsepower': 355, 'seats': 8, 'cargo_cu_ft': 25.5},
                    'Tahoe Premier': {'horsepower': 420, 'seats': 8, 'cargo_cu_ft': 25.5},
                    'Tahoe High Country': {'horsepower': 420, 'seats': 7, 'cargo_cu_ft': 25.5}
                },
                (1995, 2020): {
                    'Tahoe LS': {'horsepower': 355, 'seats': 9, 'cargo_cu_ft': 15.3},
                    'Tahoe LT': {'horsepower': 355, 'seats': 8, 'cargo_cu_ft': 15.3},
                    'Tahoe RST': {'horsepower': 355, 'seats': 8, 'cargo_cu_ft': 15.3},
                    'Tahoe Z71': {'horsepower': 355, 'seats': 8, 'cargo_cu_ft': 15.3},
                    'Tahoe Premier': {'horsepower': 355, 'seats': 8, 'cargo_cu_ft': 15.3},
                    'Tahoe High Country': {'horsepower': 420, 'seats': 7, 'cargo_cu_ft': 15.3}
                }
            }
        },
        'Traverse': {
            'default_specs': {'horsepower': 310, 'seats': 8, 'cargo_cu_ft': 23.0},
            'years': {
                (2018, 2026): {
                    'Traverse LS': {'horsepower': 310, 'seats': 8, 'cargo_cu_ft': 23.0},
                    'Traverse LT Cloth': {'horsepower': 310, 'seats': 8, 'cargo_cu_ft': 23.0},
                    'Traverse LT Leather': {'horsepower': 310, 'seats': 8, 'cargo_cu_ft': 23.0},
                    'Traverse Premier': {'horsepower': 310, 'seats': 7, 'cargo_cu_ft': 23.0},
                    'Traverse High Country': {'horsepower': 310, 'seats': 7, 'cargo_cu_ft': 23.0}
                },
                (2009, 2017): {
                    'Traverse LS': {'horsepower': 281, 'seats': 8, 'cargo_cu_ft': 24.4},
                    'Traverse LT Cloth': {'horsepower': 281, 'seats': 8, 'cargo_cu_ft': 24.4},
                    'Traverse LT Leather': {'horsepower': 281, 'seats': 8, 'cargo_cu_ft': 24.4},
                    'Traverse Premier': {'horsepower': 281, 'seats': 7, 'cargo_cu_ft': 24.4},
                    'Traverse High Country': {'horsepower': 281, 'seats': 7, 'cargo_cu_ft': 24.4}
                }
            }
        },
        'Trax': {
            'default_specs': {'horsepower': 137, 'seats': 5, 'cargo_cu_ft': 25.3},
            'years': {
                (2024, 2026): {
                    'Trax LS': {'horsepower': 137, 'seats': 5, 'cargo_cu_ft': 25.3},
                    'Trax LT': {'horsepower': 137, 'seats': 5, 'cargo_cu_ft': 25.3},
                    'Trax RS': {'horsepower': 137, 'seats': 5, 'cargo_cu_ft': 25.3},
                    'Trax Premier': {'horsepower': 137, 'seats': 5, 'cargo_cu_ft': 25.3}
                },
                (2015, 2023): {
                    'Trax LS': {'horsepower': 155, 'seats': 5, 'cargo_cu_ft': 18.7},
                    'Trax LT': {'horsepower': 155, 'seats': 5, 'cargo_cu_ft': 18.7},
                    'Trax RS': {'horsepower': 155, 'seats': 5, 'cargo_cu_ft': 18.7},
                    'Trax Premier': {'horsepower': 155, 'seats': 5, 'cargo_cu_ft': 18.7}
                }
            }
        }
    },
    'Chrysler': {
        '300': {
            'default_specs': {'horsepower': 292, 'seats': 5, 'cargo_cu_ft': 16.3},
            'years': {
                (2011, 2026): {
                    '300': {'horsepower': 292, 'seats': 5, 'cargo_cu_ft': 16.3},
                    '300 Limited': {'horsepower': 292, 'seats': 5, 'cargo_cu_ft': 16.3},
                    '300C': {'horsepower': 363, 'seats': 5, 'cargo_cu_ft': 16.3},
                    '300S': {'horsepower': 300, 'seats': 5, 'cargo_cu_ft': 16.3}
                },
                (2005, 2010): {
                    '300': {'horsepower': 250, 'seats': 5, 'cargo_cu_ft': 16.3},
                    '300 Limited': {'horsepower': 250, 'seats': 5, 'cargo_cu_ft': 16.3},
                    '300C': {'horsepower': 363, 'seats': 5, 'cargo_cu_ft': 16.3},
                    '300S': {'horsepower': 292, 'seats': 5, 'cargo_cu_ft': 16.3}
                }
            }
        },
        'Pacifica': {
            'default_specs': {'horsepower': 287, 'seats': 7, 'cargo_cu_ft': 32.3},
            'years': {
                (2017, 2026): {
                    'Pacifica Touring': {'horsepower': 287, 'seats': 8, 'cargo_cu_ft': 32.3},
                    'Pacifica Touring-L': {'horsepower': 287, 'seats': 7, 'cargo_cu_ft': 32.3},
                    'Pacifica Touring-L Plus': {'horsepower': 287, 'seats': 7, 'cargo_cu_ft': 32.3},
                    'Pacifica Limited': {'horsepower': 287, 'seats': 7, 'cargo_cu_ft': 32.3},
                    'Pacifica Hybrid Touring': {'horsepower': 260, 'seats': 7, 'cargo_cu_ft': 32.3},
                    'Pacifica Hybrid Touring-L': {'horsepower': 260, 'seats': 7, 'cargo_cu_ft': 32.3},
                    'Pacifica Hybrid Limited': {'horsepower': 260, 'seats': 7, 'cargo_cu_ft': 32.3}
                }
            }
        },
        'Voyager': {
            'default_specs': {'horsepower': 287, 'seats': 7, 'cargo_cu_ft': 32.3},
            'years': {
                (2020, 2026): {
                    'Voyager L': {'horsepower': 287, 'seats': 7, 'cargo_cu_ft': 32.3},
                    'Voyager LX': {'horsepower': 287, 'seats': 7, 'cargo_cu_ft': 32.3}
                }
            }
        }
    },
    'Dodge': {
        'Avenger': {
            'default_specs': {'horsepower': 173, 'seats': 5, 'cargo_cu_ft': 13.6},
            'years': {
                (2008, 2014): {
                    'SE': {'horsepower': 173, 'seats': 5, 'cargo_cu_ft': 13.6},
                    'SXT': {'horsepower': 173, 'seats': 5, 'cargo_cu_ft': 13.6},
                    'R/T': {'horsepower': 283, 'seats': 5, 'cargo_cu_ft': 13.6}
                }
            }
        },
        'Caliber': {
            'default_specs': {'horsepower': 158, 'seats': 5, 'cargo_cu_ft': 17.2},
            'years': {
                (2007, 2012): {
                    'SE': {'horsepower': 158, 'seats': 5, 'cargo_cu_ft': 17.2},
                    'SXT': {'horsepower': 158, 'seats': 5, 'cargo_cu_ft': 17.2},
                    'R/T': {'horsepower': 172, 'seats': 5, 'cargo_cu_ft': 17.2}
                }
            }
        },
        'Challenger': {
            'default_specs': {'horsepower': 305, 'seats': 5, 'cargo_cu_ft': 16.2},
            'years': {
                (2015, 2025): {
                    'SXT': {'horsepower': 305, 'seats': 5, 'cargo_cu_ft': 16.2},
                    'GT': {'horsepower': 305, 'seats': 5, 'cargo_cu_ft': 16.2},
                    'R/T': {'horsepower': 375, 'seats': 5, 'cargo_cu_ft': 16.2},
                    'R/T Scat Pack': {'horsepower': 485, 'seats': 5, 'cargo_cu_ft': 16.2},
                    'SRT 392': {'horsepower': 485, 'seats': 5, 'cargo_cu_ft': 16.2},
                    'SRT Hellcat': {'horsepower': 717, 'seats': 5, 'cargo_cu_ft': 16.2},
                    'SRT Hellcat Redeye': {'horsepower': 797, 'seats': 5, 'cargo_cu_ft': 16.2}
                },
                (2008, 2014): {
                    'SXT': {'horsepower': 250, 'seats': 5, 'cargo_cu_ft': 16.2},
                    'R/T': {'horsepower': 375, 'seats': 5, 'cargo_cu_ft': 16.2},
                    'SRT 392': {'horsepower': 470, 'seats': 5, 'cargo_cu_ft': 16.2}
                }
            }
        },
        'Charger': {
            'default_specs': {'horsepower': 292, 'seats': 5, 'cargo_cu_ft': 16.5},
            'years': {
                (2015, 2023): {
                    'SXT': {'horsepower': 292, 'seats': 5, 'cargo_cu_ft': 16.5},
                    'GT': {'horsepower': 300, 'seats': 5, 'cargo_cu_ft': 16.5},
                    'R/T': {'horsepower': 370, 'seats': 5, 'cargo_cu_ft': 16.5},
                    'R/T Scat Pack': {'horsepower': 485, 'seats': 5, 'cargo_cu_ft': 16.5},
                    'SRT 392': {'horsepower': 485, 'seats': 5, 'cargo_cu_ft': 16.5},
                    'SRT Hellcat': {'horsepower': 717, 'seats': 5, 'cargo_cu_ft': 16.5},
                    'SRT Hellcat Redeye': {'horsepower': 797, 'seats': 5, 'cargo_cu_ft': 16.5}
                },
                (2006, 2014): {
                    'SXT': {'horsepower': 250, 'seats': 5, 'cargo_cu_ft': 16.5},
                    'R/T': {'horsepower': 370, 'seats': 5, 'cargo_cu_ft': 16.5},
                    'SRT 392': {'horsepower': 470, 'seats': 5, 'cargo_cu_ft': 16.5}
                }
            }
        },
        'Dart': {
            'default_specs': {'horsepower': 160, 'seats': 5, 'cargo_cu_ft': 13.1},
            'years': {
                (2013, 2016): {
                    'SE': {'horsepower': 160, 'seats': 5, 'cargo_cu_ft': 13.1},
                    'SXT': {'horsepower': 160, 'seats': 5, 'cargo_cu_ft': 13.1},
                    'Limited': {'horsepower': 160, 'seats': 5, 'cargo_cu_ft': 13.1},
                    'GT': {'horsepower': 184, 'seats': 5, 'cargo_cu_ft': 13.1}
                }
            }
        },
        'Durango': {
            'default_specs': {'horsepower': 293, 'seats': 7, 'cargo_cu_ft': 17.2},
            'years': {
                (2011, 2025): {
                    'SXT Plus': {'horsepower': 293, 'seats': 7, 'cargo_cu_ft': 17.2},
                    'GT': {'horsepower': 293, 'seats': 7, 'cargo_cu_ft': 17.2},
                    'Limited': {'horsepower': 360, 'seats': 7, 'cargo_cu_ft': 17.2},
                    'R/T': {'horsepower': 360, 'seats': 7, 'cargo_cu_ft': 17.2},
                    'SRT 392': {'horsepower': 475, 'seats': 7, 'cargo_cu_ft': 17.2}
                }
            }
        },
        'Grand Caravan': {
            'default_specs': {'horsepower': 283, 'seats': 7, 'cargo_cu_ft': 33.0},
            'years': {
                (2008, 2020): {
                    'SE': {'horsepower': 283, 'seats': 7, 'cargo_cu_ft': 33.0},
                    'SXT': {'horsepower': 283, 'seats': 7, 'cargo_cu_ft': 33.0},
                    'R/T': {'horsepower': 283, 'seats': 7, 'cargo_cu_ft': 33.0}
                }
            }
        },
        'Journey': {
            'default_specs': {'horsepower': 173, 'seats': 7, 'cargo_cu_ft': 10.7},
            'years': {
                (2009, 2020): {
                    'SE': {'horsepower': 173, 'seats': 5, 'cargo_cu_ft': 10.7},
                    'SXT': {'horsepower': 173, 'seats': 7, 'cargo_cu_ft': 10.7},
                    'GT': {'horsepower': 283, 'seats': 7, 'cargo_cu_ft': 10.7}
                }
            }
        },
        'Nitro': {
            'default_specs': {'horsepower': 210, 'seats': 5, 'cargo_cu_ft': 37.0},
            'years': {
                (2007, 2012): {
                    'SE': {'horsepower': 210, 'seats': 5, 'cargo_cu_ft': 37.0},
                    'SXT': {'horsepower': 210, 'seats': 5, 'cargo_cu_ft': 37.0},
                    'R/T': {'horsepower': 260, 'seats': 5, 'cargo_cu_ft': 37.0}
                }
            }
        },
        'Ram 1500': {
            'default_specs': {'horsepower': 395, 'seats': 6, 'cargo_cu_ft': 61.5},
            'years': {
                (2009, 2018): {
                    'Tradesman': {'horsepower': 305, 'seats': 3, 'cargo_cu_ft': 61.5},
                    'Express': {'horsepower': 305, 'seats': 6, 'cargo_cu_ft': 61.5},
                    'SLT': {'horsepower': 305, 'seats': 6, 'cargo_cu_ft': 61.5},
                    'Sport': {'horsepower': 395, 'seats': 6, 'cargo_cu_ft': 61.5},
                    'Laramie': {'horsepower': 395, 'seats': 6, 'cargo_cu_ft': 61.5},
                    'Laramie Longhorn': {'horsepower': 395, 'seats': 6, 'cargo_cu_ft': 61.5},
                    'Limited': {'horsepower': 395, 'seats': 6, 'cargo_cu_ft': 61.5}
                }
            }
        },
        'Viper': {
            'default_specs': {'horsepower': 645, 'seats': 2, 'cargo_cu_ft': 5.6},
            'years': {
                (2003, 2017): {
                    'SRT': {'horsepower': 645, 'seats': 2, 'cargo_cu_ft': 5.6},
                    'SRT GTS': {'horsepower': 645, 'seats': 2, 'cargo_cu_ft': 5.6},
                    'SRT ACR': {'horsepower': 645, 'seats': 2, 'cargo_cu_ft': 5.6}
                }
            }
        }
    },

    'Fiat': {
        '124 Spider': {
            'default_specs': {'horsepower': 160, 'seats': 2, 'cargo_cu_ft': 4.9},
            'years': {(2017, 2020): {'Classica': {'horsepower': 160, 'seats': 2, 'cargo_cu_ft': 4.9}, 'Lusso': {'horsepower': 160, 'seats': 2, 'cargo_cu_ft': 4.9}, 'Abarth': {'horsepower': 164, 'seats': 2, 'cargo_cu_ft': 4.9}}}
        },
        '500': {
            'default_specs': {'horsepower': 135, 'seats': 4, 'cargo_cu_ft': 9.5},
            'years': {(2011, 2019): {'Pop': {'horsepower': 135, 'seats': 4, 'cargo_cu_ft': 9.5}, 'Lounge': {'horsepower': 135, 'seats': 4, 'cargo_cu_ft': 9.5}, 'Abarth': {'horsepower': 160, 'seats': 4, 'cargo_cu_ft': 9.5}}}
        },
        '500L': {
            'default_specs': {'horsepower': 160, 'seats': 5, 'cargo_cu_ft': 22.4},
            'years': {(2014, 2020): {'Pop': {'horsepower': 160, 'seats': 5, 'cargo_cu_ft': 22.4}, 'Lounge': {'horsepower': 160, 'seats': 5, 'cargo_cu_ft': 22.4}}}
        },
        '500X': {
            'default_specs': {'horsepower': 177, 'seats': 5, 'cargo_cu_ft': 12.7},
            'years': {(2016, 2019): {'Pop': {'horsepower': 177, 'seats': 5, 'cargo_cu_ft': 12.7}, 'Lounge': {'horsepower': 177, 'seats': 5, 'cargo_cu_ft': 12.7}, 'Trekking': {'horsepower': 177, 'seats': 5, 'cargo_cu_ft': 12.7}}}
        }
    },
    'Ford': {
        'Bronco': {
            'default_specs': {'horsepower': 300, 'seats': 5, 'cargo_cu_ft': 35.6},
            'years': {(2021, 2025): {'Base': {'horsepower': 275, 'seats': 5, 'cargo_cu_ft': 35.6}, 'Big Bend': {'horsepower': 275, 'seats': 5, 'cargo_cu_ft': 35.6}, 'Black Diamond': {'horsepower': 275, 'seats': 5, 'cargo_cu_ft': 35.6}, 'Outer Banks': {'horsepower': 275, 'seats': 5, 'cargo_cu_ft': 35.6}, 'Badlands': {'horsepower': 300, 'seats': 5, 'cargo_cu_ft': 35.6}, 'Wildtrak': {'horsepower': 300, 'seats': 5, 'cargo_cu_ft': 35.6}, 'Raptor': {'horsepower': 418, 'seats': 5, 'cargo_cu_ft': 35.6}, 'Heritage': {'horsepower': 275, 'seats': 5, 'cargo_cu_ft': 35.6}}}
        },
        'Edge': {
            'default_specs': {'horsepower': 250, 'seats': 5, 'cargo_cu_ft': 39.2},
            'years': {(2015, 2025): {'SE': {'horsepower': 250, 'seats': 5, 'cargo_cu_ft': 39.2}, 'SEL': {'horsepower': 250, 'seats': 5, 'cargo_cu_ft': 39.2}, 'Titanium': {'horsepower': 250, 'seats': 5, 'cargo_cu_ft': 39.2}, 'ST': {'horsepower': 335, 'seats': 5, 'cargo_cu_ft': 39.2}}, (2007, 2014): {'SE': {'horsepower': 265, 'seats': 5, 'cargo_cu_ft': 32.2}, 'SEL': {'horsepower': 265, 'seats': 5, 'cargo_cu_ft': 32.2}, 'Titanium': {'horsepower': 265, 'seats': 5, 'cargo_cu_ft': 32.2}, 'ST': {'horsepower': 315, 'seats': 5, 'cargo_cu_ft': 32.2}}}
        },
        'Escape': {
            'default_specs': {'horsepower': 180, 'seats': 5, 'cargo_cu_ft': 33.5},
            'years': {(2020, 2025): {'Active': {'horsepower': 180, 'seats': 5, 'cargo_cu_ft': 33.5}, 'ST-Line': {'horsepower': 250, 'seats': 5, 'cargo_cu_ft': 33.5}, 'ST-Line Elite': {'horsepower': 250, 'seats': 5, 'cargo_cu_ft': 33.5}, 'Platinum': {'horsepower': 250, 'seats': 5, 'cargo_cu_ft': 33.5}, 'Hybrid ST-Line': {'horsepower': 210, 'seats': 5, 'cargo_cu_ft': 33.5}, 'Hybrid ST-Line Elite': {'horsepower': 210, 'seats': 5, 'cargo_cu_ft': 33.5}, 'Hybrid Platinum': {'horsepower': 210, 'seats': 5, 'cargo_cu_ft': 33.5}}, (2001, 2019): {'Active': {'horsepower': 168, 'seats': 5, 'cargo_cu_ft': 34.3}, 'ST-Line': {'horsepower': 245, 'seats': 5, 'cargo_cu_ft': 34.3}, 'Platinum': {'horsepower': 245, 'seats': 5, 'cargo_cu_ft': 34.3}}}
        },
        'Expedition': {
            'default_specs': {'horsepower': 380, 'seats': 8, 'cargo_cu_ft': 19.3},
            'years': {(2018, 2025): {'XL': {'horsepower': 380, 'seats': 8, 'cargo_cu_ft': 19.3}, 'XLT': {'horsepower': 380, 'seats': 8, 'cargo_cu_ft': 19.3}, 'Limited': {'horsepower': 380, 'seats': 8, 'cargo_cu_ft': 19.3}, 'King Ranch': {'horsepower': 380, 'seats': 8, 'cargo_cu_ft': 19.3}, 'Platinum': {'horsepower': 400, 'seats': 8, 'cargo_cu_ft': 19.3}}, (2000, 2017): {'XL': {'horsepower': 365, 'seats': 8, 'cargo_cu_ft': 18.6}, 'XLT': {'horsepower': 365, 'seats': 8, 'cargo_cu_ft': 18.6}, 'Limited': {'horsepower': 365, 'seats': 8, 'cargo_cu_ft': 18.6}, 'King Ranch': {'horsepower': 365, 'seats': 8, 'cargo_cu_ft': 18.6}, 'Platinum': {'horsepower': 365, 'seats': 8, 'cargo_cu_ft': 18.6}}}
        },
        'Explorer': {
            'default_specs': {'horsepower': 300, 'seats': 7, 'cargo_cu_ft': 18.2},
            'years': {(2020, 2025): {'Base': {'horsepower': 300, 'seats': 7, 'cargo_cu_ft': 18.2}, 'XLT': {'horsepower': 300, 'seats': 7, 'cargo_cu_ft': 18.2}, 'Limited': {'horsepower': 300, 'seats': 7, 'cargo_cu_ft': 18.2}, 'ST': {'horsepower': 400, 'seats': 7, 'cargo_cu_ft': 18.2}, 'Platinum': {'horsepower': 400, 'seats': 7, 'cargo_cu_ft': 18.2}}, (2000, 2019): {'Base': {'horsepower': 290, 'seats': 7, 'cargo_cu_ft': 21.0}, 'XLT': {'horsepower': 290, 'seats': 7, 'cargo_cu_ft': 21.0}, 'Limited': {'horsepower': 290, 'seats': 7, 'cargo_cu_ft': 21.0}, 'ST': {'horsepower': 365, 'seats': 7, 'cargo_cu_ft': 21.0}, 'Platinum': {'horsepower': 365, 'seats': 7, 'cargo_cu_ft': 21.0}}}
        },
        'F-150': {
            'default_specs': {'horsepower': 325, 'seats': 6, 'cargo_cu_ft': 62.3},
            'years': {(2021, 2025): {'Regular Cab': {'horsepower': 290, 'seats': 3, 'cargo_cu_ft': 62.3}, 'SuperCab XL': {'horsepower': 290, 'seats': 6, 'cargo_cu_ft': 62.3}, 'SuperCab XLT': {'horsepower': 325, 'seats': 6, 'cargo_cu_ft': 62.3}, 'SuperCrew XLT': {'horsepower': 325, 'seats': 6, 'cargo_cu_ft': 62.3}, 'Lariat': {'horsepower': 400, 'seats': 6, 'cargo_cu_ft': 62.3}, 'King Ranch': {'horsepower': 400, 'seats': 6, 'cargo_cu_ft': 62.3}, 'Platinum': {'horsepower': 400, 'seats': 6, 'cargo_cu_ft': 62.3}, 'Limited': {'horsepower': 400, 'seats': 6, 'cargo_cu_ft': 62.3}, 'Raptor': {'horsepower': 450, 'seats': 5, 'cargo_cu_ft': 62.3}}, (2000, 2020): {'Regular Cab': {'horsepower': 282, 'seats': 3, 'cargo_cu_ft': 62.3}, 'SuperCab XL': {'horsepower': 282, 'seats': 6, 'cargo_cu_ft': 62.3}, 'SuperCab XLT': {'horsepower': 325, 'seats': 6, 'cargo_cu_ft': 62.3}, 'SuperCrew XLT': {'horsepower': 325, 'seats': 6, 'cargo_cu_ft': 62.3}, 'Lariat': {'horsepower': 375, 'seats': 6, 'cargo_cu_ft': 62.3}, 'King Ranch': {'horsepower': 375, 'seats': 6, 'cargo_cu_ft': 62.3}, 'Platinum': {'horsepower': 375, 'seats': 6, 'cargo_cu_ft': 62.3}, 'Limited': {'horsepower': 450, 'seats': 6, 'cargo_cu_ft': 62.3}, 'Raptor': {'horsepower': 450, 'seats': 5, 'cargo_cu_ft': 62.3}}}
        },
        'F-250': {
            'default_specs': {'horsepower': 385, 'seats': 6, 'cargo_cu_ft': 78.5},
            'years': {(2000, 2025): {'Regular Cab XL': {'horsepower': 385, 'seats': 3, 'cargo_cu_ft': 78.5}, 'SuperCab XL': {'horsepower': 385, 'seats': 6, 'cargo_cu_ft': 78.5}, 'SuperCab XLT': {'horsepower': 385, 'seats': 6, 'cargo_cu_ft': 78.5}, 'Crew Cab XLT': {'horsepower': 385, 'seats': 6, 'cargo_cu_ft': 78.5}, 'Lariat': {'horsepower': 430, 'seats': 6, 'cargo_cu_ft': 78.5}, 'King Ranch': {'horsepower': 430, 'seats': 6, 'cargo_cu_ft': 78.5}, 'Platinum': {'horsepower': 430, 'seats': 6, 'cargo_cu_ft': 78.5}, 'Limited': {'horsepower': 430, 'seats': 6, 'cargo_cu_ft': 78.5}, 'Tremor': {'horsepower': 430, 'seats': 6, 'cargo_cu_ft': 78.5}}}
        },
        'Focus': {
            'default_specs': {'horsepower': 160, 'seats': 5, 'cargo_cu_ft': 23.8},
            'years': {(2012, 2018): {'S': {'horsepower': 160, 'seats': 5, 'cargo_cu_ft': 23.8}, 'SE': {'horsepower': 160, 'seats': 5, 'cargo_cu_ft': 23.8}, 'Titanium': {'horsepower': 160, 'seats': 5, 'cargo_cu_ft': 23.8}, 'ST': {'horsepower': 252, 'seats': 5, 'cargo_cu_ft': 23.8}, 'RS': {'horsepower': 350, 'seats': 5, 'cargo_cu_ft': 23.8}, 'Electric': {'horsepower': 143, 'seats': 5, 'cargo_cu_ft': 14.5}}, (2000, 2011): {'S': {'horsepower': 140, 'seats': 5, 'cargo_cu_ft': 13.8}, 'SE': {'horsepower': 140, 'seats': 5, 'cargo_cu_ft': 13.8}, 'Titanium': {'horsepower': 140, 'seats': 5, 'cargo_cu_ft': 13.8}}}
        },
        'Fusion': {
            'default_specs': {'horsepower': 175, 'seats': 5, 'cargo_cu_ft': 16.0},
            'years': {(2013, 2020): {'S': {'horsepower': 175, 'seats': 5, 'cargo_cu_ft': 16.0}, 'SE': {'horsepower': 175, 'seats': 5, 'cargo_cu_ft': 16.0}, 'SEL': {'horsepower': 175, 'seats': 5, 'cargo_cu_ft': 16.0}, 'Titanium': {'horsepower': 245, 'seats': 5, 'cargo_cu_ft': 16.0}, 'Sport': {'horsepower': 325, 'seats': 5, 'cargo_cu_ft': 16.0}, 'Hybrid SE': {'horsepower': 188, 'seats': 5, 'cargo_cu_ft': 12.0}, 'Hybrid SEL': {'horsepower': 188, 'seats': 5, 'cargo_cu_ft': 12.0}, 'Hybrid Titanium': {'horsepower': 188, 'seats': 5, 'cargo_cu_ft': 12.0}}, (2006, 2012): {'S': {'horsepower': 175, 'seats': 5, 'cargo_cu_ft': 16.5}, 'SE': {'horsepower': 175, 'seats': 5, 'cargo_cu_ft': 16.5}, 'SEL': {'horsepower': 240, 'seats': 5, 'cargo_cu_ft': 16.5}}}
        },
        'Mustang': {
            'default_specs': {'horsepower': 310, 'seats': 4, 'cargo_cu_ft': 13.5},
            'years': {(2024, 2025): {'EcoBoost': {'horsepower': 315, 'seats': 4, 'cargo_cu_ft': 13.5}, 'EcoBoost Premium': {'horsepower': 315, 'seats': 4, 'cargo_cu_ft': 13.5}, 'GT': {'horsepower': 480, 'seats': 4, 'cargo_cu_ft': 13.5}, 'GT Premium': {'horsepower': 480, 'seats': 4, 'cargo_cu_ft': 13.5}, 'Dark Horse': {'horsepower': 500, 'seats': 4, 'cargo_cu_ft': 13.5}, 'Shelby GT500': {'horsepower': 760, 'seats': 4, 'cargo_cu_ft': 13.5}}, (2015, 2023): {'EcoBoost': {'horsepower': 310, 'seats': 4, 'cargo_cu_ft': 13.5}, 'EcoBoost Premium': {'horsepower': 310, 'seats': 4, 'cargo_cu_ft': 13.5}, 'GT': {'horsepower': 450, 'seats': 4, 'cargo_cu_ft': 13.5}, 'GT Premium': {'horsepower': 450, 'seats': 4, 'cargo_cu_ft': 13.5}, 'Dark Horse': {'horsepower': 500, 'seats': 4, 'cargo_cu_ft': 13.5}, 'Shelby GT500': {'horsepower': 760, 'seats': 4, 'cargo_cu_ft': 13.5}}, (2000, 2014): {'EcoBoost': {'horsepower': 305, 'seats': 4, 'cargo_cu_ft': 13.4}, 'GT': {'horsepower': 412, 'seats': 4, 'cargo_cu_ft': 13.4}, 'Shelby GT500': {'horsepower': 662, 'seats': 4, 'cargo_cu_ft': 13.4}}}
        },
        'Ranger': {
            'default_specs': {'horsepower': 270, 'seats': 5, 'cargo_cu_ft': 51.8},
            'years': {(2019, 2025): {'Regular Cab XL': {'horsepower': 270, 'seats': 2, 'cargo_cu_ft': 51.8}, 'SuperCab XL': {'horsepower': 270, 'seats': 5, 'cargo_cu_ft': 51.8}, 'SuperCab XLT': {'horsepower': 270, 'seats': 5, 'cargo_cu_ft': 51.8}, 'SuperCab Sport': {'horsepower': 270, 'seats': 5, 'cargo_cu_ft': 51.8}}, (2000, 2011): {'Regular Cab XL': {'horsepower': 143, 'seats': 2, 'cargo_cu_ft': 51.8}, 'SuperCab XL': {'horsepower': 207, 'seats': 5, 'cargo_cu_ft': 51.8}, 'SuperCab XLT': {'horsepower': 207, 'seats': 5, 'cargo_cu_ft': 51.8}, 'SuperCab Sport': {'horsepower': 207, 'seats': 5, 'cargo_cu_ft': 51.8}}}
        },
        'Taurus': {
            'default_specs': {'horsepower': 288, 'seats': 5, 'cargo_cu_ft': 20.1},
            'years': {(2010, 2019): {'SE': {'horsepower': 288, 'seats': 5, 'cargo_cu_ft': 20.1}, 'SEL': {'horsepower': 288, 'seats': 5, 'cargo_cu_ft': 20.1}, 'Limited': {'horsepower': 288, 'seats': 5, 'cargo_cu_ft': 20.1}, 'SHO': {'horsepower': 365, 'seats': 5, 'cargo_cu_ft': 20.1}}, (2000, 2009): {'SE': {'horsepower': 200, 'seats': 5, 'cargo_cu_ft': 17.0}, 'SEL': {'horsepower': 200, 'seats': 5, 'cargo_cu_ft': 17.0}, 'Limited': {'horsepower': 200, 'seats': 5, 'cargo_cu_ft': 17.0}}}
        }
    },
    'Genesis': {
        'Electrified G80': {'default_specs': {'horsepower': 365, 'seats': 5, 'cargo_cu_ft': 10.9}, 'years': {(2022, 2026): {'Electrified G80': {'horsepower': 365, 'seats': 5, 'cargo_cu_ft': 10.9}}}},
        'Electrified GV70': {'default_specs': {'horsepower': 429, 'seats': 5, 'cargo_cu_ft': 28.9}, 'years': {(2023, 2026): {'Electrified GV70': {'horsepower': 429, 'seats': 5, 'cargo_cu_ft': 28.9}}}},
        'G70': {'default_specs': {'horsepower': 300, 'seats': 5, 'cargo_cu_ft': 10.5}, 'years': {(2019, 2026): {'G70 2.5T': {'horsepower': 300, 'seats': 5, 'cargo_cu_ft': 10.5}, 'G70 3.3T Sport': {'horsepower': 365, 'seats': 5, 'cargo_cu_ft': 10.5}}}},
        'G80': {'default_specs': {'horsepower': 300, 'seats': 5, 'cargo_cu_ft': 13.1}, 'years': {(2021, 2026): {'G80 2.5T': {'horsepower': 300, 'seats': 5, 'cargo_cu_ft': 13.1}, 'G80 3.5T': {'horsepower': 375, 'seats': 5, 'cargo_cu_ft': 13.1}, 'G80 Sport': {'horsepower': 375, 'seats': 5, 'cargo_cu_ft': 13.1}}, (2017, 2020): {'G80 2.5T': {'horsepower': 311, 'seats': 5, 'cargo_cu_ft': 15.3}, 'G80 3.5T': {'horsepower': 370, 'seats': 5, 'cargo_cu_ft': 15.3}, 'G80 Sport': {'horsepower': 365, 'seats': 5, 'cargo_cu_ft': 15.3}}}},
        'G90': {'default_specs': {'horsepower': 409, 'seats': 5, 'cargo_cu_ft': 11.6}, 'years': {(2023, 2026): {'G90 3.5T': {'horsepower': 409, 'seats': 5, 'cargo_cu_ft': 11.6}, 'G90 e-Supercharger': {'horsepower': 409, 'seats': 5, 'cargo_cu_ft': 11.6}}, (2017, 2022): {'G90 3.5T': {'horsepower': 365, 'seats': 5, 'cargo_cu_ft': 15.7}, 'G90 e-Supercharger': {'horsepower': 420, 'seats': 5, 'cargo_cu_ft': 15.7}}}},
        'GV60': {'default_specs': {'horsepower': 314, 'seats': 5, 'cargo_cu_ft': 24.0}, 'years': {(2023, 2026): {'GV60 Advanced': {'horsepower': 314, 'seats': 5, 'cargo_cu_ft': 24.0}, 'GV60 Performance': {'horsepower': 429, 'seats': 5, 'cargo_cu_ft': 24.0}, 'GV60 Magma': {'horsepower': 429, 'seats': 5, 'cargo_cu_ft': 24.0}}}},
        'GV70': {'default_specs': {'horsepower': 300, 'seats': 5, 'cargo_cu_ft': 28.9}, 'years': {(2022, 2026): {'GV70 2.5T': {'horsepower': 300, 'seats': 5, 'cargo_cu_ft': 28.9}, 'GV70 3.5T': {'horsepower': 375, 'seats': 5, 'cargo_cu_ft': 28.9}}}},
        'GV80': {'default_specs': {'horsepower': 300, 'seats': 7, 'cargo_cu_ft': 11.0}, 'years': {(2021, 2026): {'GV80 2.5T': {'horsepower': 300, 'seats': 7, 'cargo_cu_ft': 11.0}, 'GV80 3.5T': {'horsepower': 375, 'seats': 7, 'cargo_cu_ft': 11.0}, 'GV80 Coupe 3.5T': {'horsepower': 375, 'seats': 5, 'cargo_cu_ft': 28.5}}}}
    },
    'GMC': {
        'Acadia': {'default_specs': {'horsepower': 228, 'seats': 7, 'cargo_cu_ft': 12.8}, 'years': {(2017, 2025): {'SLE': {'horsepower': 228, 'seats': 7, 'cargo_cu_ft': 12.8}, 'SLT': {'horsepower': 228, 'seats': 7, 'cargo_cu_ft': 12.8}, 'AT4': {'horsepower': 310, 'seats': 7, 'cargo_cu_ft': 12.8}, 'Denali': {'horsepower': 310, 'seats': 7, 'cargo_cu_ft': 12.8}}, (2007, 2016): {'SLE': {'horsepower': 281, 'seats': 8, 'cargo_cu_ft': 24.1}, 'SLT': {'horsepower': 281, 'seats': 8, 'cargo_cu_ft': 24.1}, 'Denali': {'horsepower': 281, 'seats': 7, 'cargo_cu_ft': 24.1}}}},
        'Canyon': {'default_specs': {'horsepower': 237, 'seats': 5, 'cargo_cu_ft': 50.5}, 'years': {(2023, 2025): {'Pro': {'horsepower': 237, 'seats': 5, 'cargo_cu_ft': 50.5}, 'SLE': {'horsepower': 237, 'seats': 5, 'cargo_cu_ft': 50.5}, 'SLT': {'horsepower': 237, 'seats': 5, 'cargo_cu_ft': 50.5}, 'AT4': {'horsepower': 310, 'seats': 5, 'cargo_cu_ft': 50.5}, 'Denali': {'horsepower': 310, 'seats': 5, 'cargo_cu_ft': 50.5}}, (2004, 2022): {'Pro': {'horsepower': 200, 'seats': 5, 'cargo_cu_ft': 49.9}, 'SLE': {'horsepower': 200, 'seats': 5, 'cargo_cu_ft': 49.9}, 'SLT': {'horsepower': 308, 'seats': 5, 'cargo_cu_ft': 49.9}, 'AT4': {'horsepower': 308, 'seats': 5, 'cargo_cu_ft': 49.9}, 'Denali': {'horsepower': 308, 'seats': 5, 'cargo_cu_ft': 49.9}}}},
        'Sierra 1500': {'default_specs': {'horsepower': 355, 'seats': 6, 'cargo_cu_ft': 71.7}, 'years': {(2019, 2025): {'Regular Cab Pro': {'horsepower': 310, 'seats': 3, 'cargo_cu_ft': 71.7}, 'Double Cab SLE': {'horsepower': 310, 'seats': 6, 'cargo_cu_ft': 71.7}, 'Crew Cab SLE': {'horsepower': 310, 'seats': 6, 'cargo_cu_ft': 71.7}, 'Crew Cab SLT': {'horsepower': 355, 'seats': 6, 'cargo_cu_ft': 71.7}, 'Crew Cab AT4': {'horsepower': 420, 'seats': 6, 'cargo_cu_ft': 71.7}, 'Denali': {'horsepower': 420, 'seats': 6, 'cargo_cu_ft': 71.7}}}},
        'Terrain': {'default_specs': {'horsepower': 175, 'seats': 5, 'cargo_cu_ft': 29.6}, 'years': {(2018, 2025): {'Elevation': {'horsepower': 175, 'seats': 5, 'cargo_cu_ft': 29.6}, 'SLE': {'horsepower': 175, 'seats': 5, 'cargo_cu_ft': 29.6}, 'SLT': {'horsepower': 175, 'seats': 5, 'cargo_cu_ft': 29.6}, 'AT4': {'horsepower': 175, 'seats': 5, 'cargo_cu_ft': 29.6}, 'Denali': {'horsepower': 252, 'seats': 5, 'cargo_cu_ft': 29.6}}}},
        'Yukon': {'default_specs': {'horsepower': 355, 'seats': 8, 'cargo_cu_ft': 25.5}, 'years': {(2021, 2025): {'SLE': {'horsepower': 355, 'seats': 9, 'cargo_cu_ft': 25.5}, 'SLT': {'horsepower': 355, 'seats': 8, 'cargo_cu_ft': 25.5}, 'AT4': {'horsepower': 420, 'seats': 8, 'cargo_cu_ft': 25.5}, 'XL SLE': {'horsepower': 355, 'seats': 9, 'cargo_cu_ft': 41.5}, 'XL SLT': {'horsepower': 355, 'seats': 8, 'cargo_cu_ft': 41.5}, 'Denali': {'horsepower': 420, 'seats': 7, 'cargo_cu_ft': 25.5}, 'XL Denali': {'horsepower': 420, 'seats': 7, 'cargo_cu_ft': 41.5}}}}
    },
    'Honda': {
        'Accord': {'default_specs': {'horsepower': 192, 'seats': 5, 'cargo_cu_ft': 16.7}, 'years': {(2023, 2026): {'Accord LX': {'horsepower': 192, 'seats': 5, 'cargo_cu_ft': 16.7}, 'Accord SE': {'horsepower': 192, 'seats': 5, 'cargo_cu_ft': 16.7}, 'Accord Sport Hybrid': {'horsepower': 204, 'seats': 5, 'cargo_cu_ft': 16.7}, 'Accord EX-L Hybrid': {'horsepower': 204, 'seats': 5, 'cargo_cu_ft': 16.7}, 'Accord Sport-L Hybrid': {'horsepower': 204, 'seats': 5, 'cargo_cu_ft': 16.7}, 'Accord Touring Hybrid': {'horsepower': 204, 'seats': 5, 'cargo_cu_ft': 16.7}}, (2018, 2022): {'Accord LX': {'horsepower': 192, 'seats': 5, 'cargo_cu_ft': 16.7}, 'Accord Sport': {'horsepower': 192, 'seats': 5, 'cargo_cu_ft': 16.7}, 'Accord EX-L': {'horsepower': 192, 'seats': 5, 'cargo_cu_ft': 16.7}, 'Accord Touring': {'horsepower': 252, 'seats': 5, 'cargo_cu_ft': 16.7}}}},
        'CR-V': {'default_specs': {'horsepower': 190, 'seats': 5, 'cargo_cu_ft': 36.3}, 'years': {(2023, 2026): {'CR-V LX': {'horsepower': 190, 'seats': 5, 'cargo_cu_ft': 36.3}, 'CR-V EX': {'horsepower': 190, 'seats': 5, 'cargo_cu_ft': 36.3}, 'CR-V EX-L': {'horsepower': 190, 'seats': 5, 'cargo_cu_ft': 36.3}, 'CR-V Sport': {'horsepower': 190, 'seats': 5, 'cargo_cu_ft': 36.3}, 'CR-V Sport Touring': {'horsepower': 190, 'seats': 5, 'cargo_cu_ft': 36.3}, 'CR-V Hybrid Sport': {'horsepower': 204, 'seats': 5, 'cargo_cu_ft': 36.3}, 'CR-V Hybrid Sport Touring': {'horsepower': 204, 'seats': 5, 'cargo_cu_ft': 36.3}}}},
        'Civic': {'default_specs': {'horsepower': 158, 'seats': 5, 'cargo_cu_ft': 14.8}, 'years': {(2022, 2026): {'Civic LX': {'horsepower': 158, 'seats': 5, 'cargo_cu_ft': 14.8}, 'Civic Sport': {'horsepower': 158, 'seats': 5, 'cargo_cu_ft': 14.8}, 'Civic Sport Hybrid': {'horsepower': 200, 'seats': 5, 'cargo_cu_ft': 14.8}, 'Civic Sport Touring Hybrid': {'horsepower': 200, 'seats': 5, 'cargo_cu_ft': 14.8}, 'Civic Si': {'horsepower': 200, 'seats': 5, 'cargo_cu_ft': 14.8}, 'Civic Type R': {'horsepower': 315, 'seats': 5, 'cargo_cu_ft': 24.5}}}},
        'Insight': {'default_specs': {'horsepower': 151, 'seats': 5, 'cargo_cu_ft': 15.1}, 'years': {(2019, 2022): {'Insight LX': {'horsepower': 151, 'seats': 5, 'cargo_cu_ft': 15.1}, 'Insight EX': {'horsepower': 151, 'seats': 5, 'cargo_cu_ft': 15.1}, 'Insight Touring': {'horsepower': 151, 'seats': 5, 'cargo_cu_ft': 15.1}}}},
        'Odyssey': {'default_specs': {'horsepower': 280, 'seats': 8, 'cargo_cu_ft': 32.8}, 'years': {(2018, 2026): {'Odyssey LX': {'horsepower': 280, 'seats': 8, 'cargo_cu_ft': 32.8}, 'Odyssey EX-L': {'horsepower': 280, 'seats': 8, 'cargo_cu_ft': 32.8}, 'Odyssey Touring': {'horsepower': 280, 'seats': 8, 'cargo_cu_ft': 32.8}, 'Odyssey Elite': {'horsepower': 280, 'seats': 8, 'cargo_cu_ft': 32.8}}}},
        'Passport': {'default_specs': {'horsepower': 280, 'seats': 5, 'cargo_cu_ft': 41.2}, 'years': {(2019, 2026): {'Passport Sport': {'horsepower': 280, 'seats': 5, 'cargo_cu_ft': 41.2}, 'Passport EX-L': {'horsepower': 280, 'seats': 5, 'cargo_cu_ft': 41.2}, 'Passport Touring': {'horsepower': 280, 'seats': 5, 'cargo_cu_ft': 41.2}, 'Passport Elite': {'horsepower': 280, 'seats': 5, 'cargo_cu_ft': 41.2}, 'Passport TrailSport': {'horsepower': 280, 'seats': 5, 'cargo_cu_ft': 41.2}}}},
        'Pilot': {'default_specs': {'horsepower': 285, 'seats': 8, 'cargo_cu_ft': 16.5}, 'years': {(2023, 2026): {'Pilot LX': {'horsepower': 285, 'seats': 8, 'cargo_cu_ft': 16.5}, 'Pilot EX-L': {'horsepower': 285, 'seats': 8, 'cargo_cu_ft': 16.5}, 'Pilot TrailSport': {'horsepower': 285, 'seats': 8, 'cargo_cu_ft': 16.5}, 'Pilot Touring': {'horsepower': 285, 'seats': 8, 'cargo_cu_ft': 16.5}, 'Pilot Elite': {'horsepower': 285, 'seats': 7, 'cargo_cu_ft': 16.5}}}},
        'Ridgeline': {'default_specs': {'horsepower': 280, 'seats': 5, 'cargo_cu_ft': 33.9}, 'years': {(2006, 2014): {'Ridgeline Sport': {'horsepower': 280, 'seats': 5, 'cargo_cu_ft': 33.9}, 'Ridgeline RTL': {'horsepower': 280, 'seats': 5, 'cargo_cu_ft': 33.9}, 'Ridgeline RTL-E': {'horsepower': 280, 'seats': 5, 'cargo_cu_ft': 33.9}, 'Ridgeline TrailSport': {'horsepower': 280, 'seats': 5, 'cargo_cu_ft': 33.9}, 'Ridgeline Black Edition': {'horsepower': 280, 'seats': 5, 'cargo_cu_ft': 33.9}}}}
    },
    'Hyundai': {
        'Elantra': {'default_specs': {'horsepower': 147, 'seats': 5, 'cargo_cu_ft': 14.2}, 'years': {(2021, 2026): {'Elantra SE': {'horsepower': 147, 'seats': 5, 'cargo_cu_ft': 14.2}, 'Elantra SEL': {'horsepower': 147, 'seats': 5, 'cargo_cu_ft': 14.2}, 'Elantra Limited': {'horsepower': 147, 'seats': 5, 'cargo_cu_ft': 14.2}, 'Elantra N': {'horsepower': 276, 'seats': 5, 'cargo_cu_ft': 14.2}}}},
        'Genesis': {'default_specs': {'horsepower': 311, 'seats': 5, 'cargo_cu_ft': 15.3}, 'years': {(2009, 2016): {'Genesis 3.8': {'horsepower': 311, 'seats': 5, 'cargo_cu_ft': 15.3}, 'Genesis 5.0': {'horsepower': 420, 'seats': 5, 'cargo_cu_ft': 15.3}, 'Genesis 5.0 Ultimate': {'horsepower': 420, 'seats': 5, 'cargo_cu_ft': 15.3}}}},
        'Ioniq': {'default_specs': {'horsepower': 139, 'seats': 5, 'cargo_cu_ft': 23.2}, 'years': {(2017, 2022): {'Ioniq Hybrid Blue': {'horsepower': 139, 'seats': 5, 'cargo_cu_ft': 23.2}, 'Ioniq Hybrid SEL': {'horsepower': 139, 'seats': 5, 'cargo_cu_ft': 23.2}, 'Ioniq Hybrid Limited': {'horsepower': 139, 'seats': 5, 'cargo_cu_ft': 23.2}, 'Ioniq Electric SE': {'horsepower': 134, 'seats': 5, 'cargo_cu_ft': 23.2}, 'Ioniq Electric Limited': {'horsepower': 134, 'seats': 5, 'cargo_cu_ft': 23.2}, 'Ioniq Plug-in Hybrid': {'horsepower': 139, 'seats': 5, 'cargo_cu_ft': 23.2}}}},
        'Ioniq 5': {'default_specs': {'horsepower': 225, 'seats': 5, 'cargo_cu_ft': 27.2}, 'years': {(2022, 2026): {'Ioniq 5 SE': {'horsepower': 225, 'seats': 5, 'cargo_cu_ft': 27.2}, 'Ioniq 5 SEL': {'horsepower': 320, 'seats': 5, 'cargo_cu_ft': 27.2}, 'Ioniq 5 Limited': {'horsepower': 320, 'seats': 5, 'cargo_cu_ft': 27.2}}}},
        'Ioniq 6': {'default_specs': {'horsepower': 225, 'seats': 5, 'cargo_cu_ft': 12.2}, 'years': {(2023, 2026): {'Ioniq 6 SE': {'horsepower': 225, 'seats': 5, 'cargo_cu_ft': 12.2}, 'Ioniq 6 SEL': {'horsepower': 320, 'seats': 5, 'cargo_cu_ft': 12.2}, 'Ioniq 6 Limited': {'horsepower': 320, 'seats': 5, 'cargo_cu_ft': 12.2}}}},
        'Kona': {'default_specs': {'horsepower': 147, 'seats': 5, 'cargo_cu_ft': 19.2}, 'years': {(2018, 2026): {'Kona SE': {'horsepower': 147, 'seats': 5, 'cargo_cu_ft': 19.2}, 'Kona SEL': {'horsepower': 147, 'seats': 5, 'cargo_cu_ft': 19.2}, 'Kona Limited': {'horsepower': 195, 'seats': 5, 'cargo_cu_ft': 19.2}, 'Kona N': {'horsepower': 276, 'seats': 5, 'cargo_cu_ft': 19.2}}}},
        'Palisade': {'default_specs': {'horsepower': 291, 'seats': 8, 'cargo_cu_ft': 18.0}, 'years': {(2020, 2026): {'Palisade SE': {'horsepower': 291, 'seats': 8, 'cargo_cu_ft': 18.0}, 'Palisade SEL': {'horsepower': 291, 'seats': 8, 'cargo_cu_ft': 18.0}, 'Palisade Limited': {'horsepower': 291, 'seats': 7, 'cargo_cu_ft': 18.0}, 'Palisade Calligraphy': {'horsepower': 291, 'seats': 7, 'cargo_cu_ft': 18.0}}}},
        'Santa Fe': {'default_specs': {'horsepower': 191, 'seats': 5, 'cargo_cu_ft': 36.4}, 'years': {(2024, 2026): {'Santa Fe SE': {'horsepower': 191, 'seats': 5, 'cargo_cu_ft': 36.4}, 'Santa Fe SEL': {'horsepower': 191, 'seats': 5, 'cargo_cu_ft': 36.4}, 'Santa Fe Limited': {'horsepower': 277, 'seats': 5, 'cargo_cu_ft': 36.4}, 'Santa Fe Calligraphy': {'horsepower': 277, 'seats': 5, 'cargo_cu_ft': 36.4}}}},
        'Sonata': {'default_specs': {'horsepower': 191, 'seats': 5, 'cargo_cu_ft': 16.3}, 'years': {(2020, 2026): {'Sonata SE': {'horsepower': 191, 'seats': 5, 'cargo_cu_ft': 16.3}, 'Sonata SEL': {'horsepower': 191, 'seats': 5, 'cargo_cu_ft': 16.3}, 'Sonata Limited': {'horsepower': 191, 'seats': 5, 'cargo_cu_ft': 16.3}, 'Sonata N Line': {'horsepower': 290, 'seats': 5, 'cargo_cu_ft': 16.3}}}},
        'Tucson': {'default_specs': {'horsepower': 187, 'seats': 5, 'cargo_cu_ft': 38.7}, 'years': {(2022, 2026): {'Tucson SE': {'horsepower': 187, 'seats': 5, 'cargo_cu_ft': 38.7}, 'Tucson SEL': {'horsepower': 187, 'seats': 5, 'cargo_cu_ft': 38.7}, 'Tucson Limited': {'horsepower': 187, 'seats': 5, 'cargo_cu_ft': 38.7}, 'Tucson Hybrid Blue': {'horsepower': 226, 'seats': 5, 'cargo_cu_ft': 38.7}}}},
        'Veloster': {'default_specs': {'horsepower': 147, 'seats': 4, 'cargo_cu_ft': 19.9}, 'years': {(2012, 2022): {'Veloster 2.0': {'horsepower': 147, 'seats': 4, 'cargo_cu_ft': 19.9}, 'Veloster Turbo': {'horsepower': 201, 'seats': 4, 'cargo_cu_ft': 19.9}, 'Veloster N': {'horsepower': 275, 'seats': 4, 'cargo_cu_ft': 19.9}}}}
    },
    'Infiniti': {
        'Q50': {'default_specs': {'horsepower': 300, 'seats': 5, 'cargo_cu_ft': 13.5}, 'years': {(2014, 2025): {'2.0t Pure': {'horsepower': 208, 'seats': 5, 'cargo_cu_ft': 13.5}, '2.0t Luxe': {'horsepower': 208, 'seats': 5, 'cargo_cu_ft': 13.5}, '3.0t Luxe': {'horsepower': 300, 'seats': 5, 'cargo_cu_ft': 13.5}, '3.0t Sport': {'horsepower': 300, 'seats': 5, 'cargo_cu_ft': 13.5}, 'Red Sport 400': {'horsepower': 400, 'seats': 5, 'cargo_cu_ft': 13.5}}}},
        'Q60': {'default_specs': {'horsepower': 300, 'seats': 4, 'cargo_cu_ft': 8.7}, 'years': {(2017, 2025): {'2.0t Pure': {'horsepower': 208, 'seats': 4, 'cargo_cu_ft': 8.7}, '2.0t Luxe': {'horsepower': 208, 'seats': 4, 'cargo_cu_ft': 8.7}, '3.0t Sport': {'horsepower': 300, 'seats': 4, 'cargo_cu_ft': 8.7}, 'Red Sport 400': {'horsepower': 400, 'seats': 4, 'cargo_cu_ft': 8.7}}}},
        'QX50': {'default_specs': {'horsepower': 268, 'seats': 5, 'cargo_cu_ft': 31.6}, 'years': {(2019, 2025): {'Pure': {'horsepower': 268, 'seats': 5, 'cargo_cu_ft': 31.6}, 'Luxe': {'horsepower': 268, 'seats': 5, 'cargo_cu_ft': 31.6}, 'Sensory': {'horsepower': 268, 'seats': 5, 'cargo_cu_ft': 31.6}}}},
        'QX60': {'default_specs': {'horsepower': 295, 'seats': 7, 'cargo_cu_ft': 14.5}, 'years': {(2022, 2025): {'Pure': {'horsepower': 295, 'seats': 7, 'cargo_cu_ft': 14.5}, 'Luxe': {'horsepower': 295, 'seats': 7, 'cargo_cu_ft': 14.5}, 'Sensory': {'horsepower': 295, 'seats': 7, 'cargo_cu_ft': 14.5}}}},
        'QX80': {'default_specs': {'horsepower': 400, 'seats': 8, 'cargo_cu_ft': 16.6}, 'years': {(2014, 2025): {'Luxe': {'horsepower': 400, 'seats': 8, 'cargo_cu_ft': 16.6}, 'Premium Select': {'horsepower': 400, 'seats': 8, 'cargo_cu_ft': 16.6}, 'Sensory': {'horsepower': 400, 'seats': 7, 'cargo_cu_ft': 16.6}}}}
    },
    'Jaguar': {
        'E-PACE': {'default_specs': {'horsepower': 246, 'seats': 5, 'cargo_cu_ft': 24.2}, 'years': {(2017, 2026): {'E-PACE': {'horsepower': 246, 'seats': 5, 'cargo_cu_ft': 24.2}, 'E-PACE S': {'horsepower': 246, 'seats': 5, 'cargo_cu_ft': 24.2}, 'E-PACE SE': {'horsepower': 246, 'seats': 5, 'cargo_cu_ft': 24.2}, 'E-PACE HSE': {'horsepower': 296, 'seats': 5, 'cargo_cu_ft': 24.2}}}},
        'F-PACE': {'default_specs': {'horsepower': 246, 'seats': 5, 'cargo_cu_ft': 33.5}, 'years': {(2016, 2026): {'F-PACE': {'horsepower': 246, 'seats': 5, 'cargo_cu_ft': 33.5}, 'F-PACE S': {'horsepower': 296, 'seats': 5, 'cargo_cu_ft': 33.5}, 'F-PACE SVR': {'horsepower': 550, 'seats': 5, 'cargo_cu_ft': 33.5}}}},
        'F-TYPE': {'default_specs': {'horsepower': 296, 'seats': 2, 'cargo_cu_ft': 14.4}, 'years': {(2013, 2026): {'F-TYPE': {'horsepower': 296, 'seats': 2, 'cargo_cu_ft': 14.4}, 'F-TYPE R': {'horsepower': 550, 'seats': 2, 'cargo_cu_ft': 14.4}, 'F-TYPE SVR': {'horsepower': 575, 'seats': 2, 'cargo_cu_ft': 14.4}}}},
        'I-PACE': {'default_specs': {'horsepower': 394, 'seats': 5, 'cargo_cu_ft': 25.3}, 'years': {(2018, 2026): {'I-PACE': {'horsepower': 394, 'seats': 5, 'cargo_cu_ft': 25.3}, 'I-PACE S': {'horsepower': 394, 'seats': 5, 'cargo_cu_ft': 25.3}, 'I-PACE HSE': {'horsepower': 394, 'seats': 5, 'cargo_cu_ft': 25.3}}}},
        'XE': {'default_specs': {'horsepower': 246, 'seats': 5, 'cargo_cu_ft': 11.3}, 'years': {(2015, 2026): {'XE': {'horsepower': 246, 'seats': 5, 'cargo_cu_ft': 11.3}, 'XE S': {'horsepower': 296, 'seats': 5, 'cargo_cu_ft': 11.3}}}},
        'XF': {'default_specs': {'horsepower': 246, 'seats': 5, 'cargo_cu_ft': 14.9}, 'years': {(2008, 2026): {'XF': {'horsepower': 246, 'seats': 5, 'cargo_cu_ft': 14.9}, 'XF S': {'horsepower': 296, 'seats': 5, 'cargo_cu_ft': 14.9}}}},
        'XJ': {'default_specs': {'horsepower': 340, 'seats': 5, 'cargo_cu_ft': 15.2}, 'years': {(2010, 2019): {'XJ': {'horsepower': 340, 'seats': 5, 'cargo_cu_ft': 15.2}, 'XJ Portfolio': {'horsepower': 470, 'seats': 5, 'cargo_cu_ft': 15.2}, 'XJ Supersport': {'horsepower': 550, 'seats': 5, 'cargo_cu_ft': 15.2}}}}
    },
    'Jeep': {
        'Cherokee': {'default_specs': {'horsepower': 180, 'seats': 5, 'cargo_cu_ft': 25.8}, 'years': {(2014, 2026): {'Cherokee Latitude': {'horsepower': 180, 'seats': 5, 'cargo_cu_ft': 25.8}, 'Cherokee Limited': {'horsepower': 271, 'seats': 5, 'cargo_cu_ft': 25.8}, 'Cherokee Trailhawk': {'horsepower': 271, 'seats': 5, 'cargo_cu_ft': 25.8}, 'Cherokee Overland': {'horsepower': 271, 'seats': 5, 'cargo_cu_ft': 25.8}}}},
        'Compass': {'default_specs': {'horsepower': 177, 'seats': 5, 'cargo_cu_ft': 27.2}, 'years': {(2017, 2026): {'Compass Sport': {'horsepower': 177, 'seats': 5, 'cargo_cu_ft': 27.2}, 'Compass Latitude': {'horsepower': 177, 'seats': 5, 'cargo_cu_ft': 27.2}, 'Compass Limited': {'horsepower': 200, 'seats': 5, 'cargo_cu_ft': 27.2}, 'Compass Trailhawk': {'horsepower': 200, 'seats': 5, 'cargo_cu_ft': 27.2}}}},
        'Gladiator': {'default_specs': {'horsepower': 285, 'seats': 5, 'cargo_cu_ft': 35.5}, 'years': {(2020, 2026): {'Gladiator Sport': {'horsepower': 285, 'seats': 5, 'cargo_cu_ft': 35.5}, 'Gladiator Rubicon': {'horsepower': 285, 'seats': 5, 'cargo_cu_ft': 35.5}, 'Gladiator Mojave': {'horsepower': 285, 'seats': 5, 'cargo_cu_ft': 35.5}}}},
        'Grand Cherokee': {'default_specs': {'horsepower': 293, 'seats': 5, 'cargo_cu_ft': 37.7}, 'years': {(2022, 2026): {'Grand Cherokee Laredo': {'horsepower': 293, 'seats': 5, 'cargo_cu_ft': 37.7}, 'Grand Cherokee Limited': {'horsepower': 293, 'seats': 5, 'cargo_cu_ft': 37.7}, 'Grand Cherokee Overland': {'horsepower': 357, 'seats': 5, 'cargo_cu_ft': 37.7}, 'Grand Cherokee Summit': {'horsepower': 357, 'seats': 5, 'cargo_cu_ft': 37.7}, 'Grand Cherokee Trackhawk': {'horsepower': 707, 'seats': 5, 'cargo_cu_ft': 37.7}}}},
        'Renegade': {'default_specs': {'horsepower': 177, 'seats': 5, 'cargo_cu_ft': 18.5}, 'years': {(2015, 2026): {'Renegade Sport': {'horsepower': 177, 'seats': 5, 'cargo_cu_ft': 18.5}, 'Renegade Latitude': {'horsepower': 177, 'seats': 5, 'cargo_cu_ft': 18.5}, 'Renegade Trailhawk': {'horsepower': 177, 'seats': 5, 'cargo_cu_ft': 18.5}}}},
        'Wrangler': {'default_specs': {'horsepower': 285, 'seats': 5, 'cargo_cu_ft': 12.9}, 'years': {(2018, 2026): {'Wrangler Sport': {'horsepower': 285, 'seats': 5, 'cargo_cu_ft': 12.9}, 'Wrangler Sahara': {'horsepower': 285, 'seats': 5, 'cargo_cu_ft': 12.9}, 'Wrangler Rubicon': {'horsepower': 285, 'seats': 5, 'cargo_cu_ft': 12.9}, 'Wrangler Rubicon 392': {'horsepower': 470, 'seats': 5, 'cargo_cu_ft': 12.9}}}}
    },
    'Kia': {
        'Forte': {'default_specs': {'horsepower': 147, 'seats': 5, 'cargo_cu_ft': 15.3}, 'years': {(2019, 2026): {'Forte LXS': {'horsepower': 147, 'seats': 5, 'cargo_cu_ft': 15.3}, 'Forte GT': {'horsepower': 201, 'seats': 5, 'cargo_cu_ft': 15.3}}}},
        'K4': {'default_specs': {'horsepower': 147, 'seats': 5, 'cargo_cu_ft': 14.8}, 'years': {(2025, 2026): {'K4 LX': {'horsepower': 147, 'seats': 5, 'cargo_cu_ft': 14.8}, 'K4 EX': {'horsepower': 190, 'seats': 5, 'cargo_cu_ft': 14.8}, 'K4 Hatchback LXS': {'horsepower': 147, 'seats': 5, 'cargo_cu_ft': 24.2}}}},
        'K5': {'default_specs': {'horsepower': 180, 'seats': 5, 'cargo_cu_ft': 16.0}, 'years': {(2021, 2026): {'K5 LX': {'horsepower': 180, 'seats': 5, 'cargo_cu_ft': 16.0}, 'K5 GT': {'horsepower': 290, 'seats': 5, 'cargo_cu_ft': 16.0}, 'K5 Hybrid LX': {'horsepower': 192, 'seats': 5, 'cargo_cu_ft': 16.0}}}},
        'Niro': {'default_specs': {'horsepower': 139, 'seats': 5, 'cargo_cu_ft': 19.4}, 'years': {(2017, 2025): {'Niro LX': {'horsepower': 139, 'seats': 5, 'cargo_cu_ft': 19.4}, 'Niro EX': {'horsepower': 139, 'seats': 5, 'cargo_cu_ft': 19.4}, 'Niro Touring': {'horsepower': 139, 'seats': 5, 'cargo_cu_ft': 19.4}}}},
        'Optima': {'default_specs': {'horsepower': 185, 'seats': 5, 'cargo_cu_ft': 15.9}, 'years': {(2011, 2020): {'Optima LX': {'horsepower': 185, 'seats': 5, 'cargo_cu_ft': 15.9}, 'Optima SX': {'horsepower': 245, 'seats': 5, 'cargo_cu_ft': 15.9}}}},
        'Seltos': {'default_specs': {'horsepower': 146, 'seats': 5, 'cargo_cu_ft': 26.6}, 'years': {(2021, 2025): {'Seltos LX': {'horsepower': 146, 'seats': 5, 'cargo_cu_ft': 26.6}, 'Seltos SX': {'horsepower': 175, 'seats': 5, 'cargo_cu_ft': 26.6}}}},
        'Sorento': {'default_specs': {'horsepower': 191, 'seats': 7, 'cargo_cu_ft': 12.6}, 'years': {(2021, 2025): {'Sorento LX': {'horsepower': 191, 'seats': 7, 'cargo_cu_ft': 12.6}, 'Sorento SX': {'horsepower': 281, 'seats': 7, 'cargo_cu_ft': 12.6}, 'Sorento Hybrid LX': {'horsepower': 227, 'seats': 7, 'cargo_cu_ft': 12.6}}}},
        'Soul': {'default_specs': {'horsepower': 147, 'seats': 5, 'cargo_cu_ft': 24.2}, 'years': {(2020, 2025): {'Soul LX': {'horsepower': 147, 'seats': 5, 'cargo_cu_ft': 24.2}, 'Soul GT-Line': {'horsepower': 201, 'seats': 5, 'cargo_cu_ft': 24.2}}}},
        'Sportage': {'default_specs': {'horsepower': 187, 'seats': 5, 'cargo_cu_ft': 39.4}, 'years': {(2023, 2025): {'Sportage LX': {'horsepower': 187, 'seats': 5, 'cargo_cu_ft': 39.4}, 'Sportage SX': {'horsepower': 187, 'seats': 5, 'cargo_cu_ft': 39.4}, 'Sportage Hybrid LX': {'horsepower': 227, 'seats': 5, 'cargo_cu_ft': 39.4}}}},
        'Stinger': {'default_specs': {'horsepower': 300, 'seats': 5, 'cargo_cu_ft': 23.3}, 'years': {(2018, 2025): {'Stinger GT-Line': {'horsepower': 300, 'seats': 5, 'cargo_cu_ft': 23.3}, 'Stinger GT1': {'horsepower': 368, 'seats': 5, 'cargo_cu_ft': 23.3}, 'Stinger GT2': {'horsepower': 368, 'seats': 5, 'cargo_cu_ft': 23.3}}}},
        'Telluride': {'default_specs': {'horsepower': 291, 'seats': 8, 'cargo_cu_ft': 21.0}, 'years': {(2020, 2026): {'Telluride LX': {'horsepower': 291, 'seats': 8, 'cargo_cu_ft': 21.0}, 'Telluride SX': {'horsepower': 291, 'seats': 7, 'cargo_cu_ft': 21.0}, 'Telluride X-Pro': {'horsepower': 291, 'seats': 7, 'cargo_cu_ft': 21.0}}}}
    },
    'Lexus': {
        'ES': {'default_specs': {'horsepower': 302, 'seats': 5, 'cargo_cu_ft': 16.7}, 'years': {(2019, 2025): {'ES 250': {'horsepower': 203, 'seats': 5, 'cargo_cu_ft': 16.7}, 'ES 350': {'horsepower': 302, 'seats': 5, 'cargo_cu_ft': 16.7}, 'ES 300h': {'horsepower': 215, 'seats': 5, 'cargo_cu_ft': 16.7}}}},
        'GX': {'default_specs': {'horsepower': 301, 'seats': 7, 'cargo_cu_ft': 46.7}, 'years': {(2010, 2023): {'GX 460 Base': {'horsepower': 301, 'seats': 7, 'cargo_cu_ft': 46.7}, 'GX 460 Premium': {'horsepower': 301, 'seats': 7, 'cargo_cu_ft': 46.7}, 'GX 460 Luxury': {'horsepower': 301, 'seats': 7, 'cargo_cu_ft': 46.7}}, (2024, 2026): {'GX 550 Premium': {'horsepower': 349, 'seats': 7, 'cargo_cu_ft': 44.0}, 'GX 550 Luxury': {'horsepower': 349, 'seats': 7, 'cargo_cu_ft': 44.0}, 'GX 550 Overtrail': {'horsepower': 349, 'seats': 7, 'cargo_cu_ft': 44.0}}}},
        'IS': {'default_specs': {'horsepower': 311, 'seats': 5, 'cargo_cu_ft': 10.8}, 'years': {(2021, 2025): {'IS 300': {'horsepower': 241, 'seats': 5, 'cargo_cu_ft': 10.8}, 'IS 350': {'horsepower': 311, 'seats': 5, 'cargo_cu_ft': 10.8}, 'IS 500': {'horsepower': 472, 'seats': 5, 'cargo_cu_ft': 10.8}}}},
        'LS': {'default_specs': {'horsepower': 416, 'seats': 5, 'cargo_cu_ft': 16.9}, 'years': {(2018, 2025): {'LS 500': {'horsepower': 416, 'seats': 5, 'cargo_cu_ft': 16.9}, 'LS 500h': {'horsepower': 354, 'seats': 5, 'cargo_cu_ft': 16.9}}}},
        'LX': {'default_specs': {'horsepower': 409, 'seats': 7, 'cargo_cu_ft': 44.7}, 'years': {(2016, 2021): {'LX 570 Base': {'horsepower': 383, 'seats': 8, 'cargo_cu_ft': 44.7}}, (2022, 2025): {'LX 600 Standard': {'horsepower': 409, 'seats': 7, 'cargo_cu_ft': 44.7}, 'LX 600 Premium': {'horsepower': 409, 'seats': 7, 'cargo_cu_ft': 44.7}, 'LX 600 Ultra Luxury': {'horsepower': 409, 'seats': 4, 'cargo_cu_ft': 44.7}}}},
        'NX': {'default_specs': {'horsepower': 275, 'seats': 5, 'cargo_cu_ft': 22.7}, 'years': {(2022, 2025): {'NX 250': {'horsepower': 203, 'seats': 5, 'cargo_cu_ft': 22.7}, 'NX 350': {'horsepower': 275, 'seats': 5, 'cargo_cu_ft': 22.7}, 'NX 350h': {'horsepower': 239, 'seats': 5, 'cargo_cu_ft': 22.7}, 'NX 450h+': {'horsepower': 304, 'seats': 5, 'cargo_cu_ft': 22.7}}}},
        'RX': {'default_specs': {'horsepower': 275, 'seats': 5, 'cargo_cu_ft': 29.6}, 'years': {(2023, 2025): {'RX 350': {'horsepower': 275, 'seats': 5, 'cargo_cu_ft': 29.6}, 'RX 350h': {'horsepower': 246, 'seats': 5, 'cargo_cu_ft': 29.6}, 'RX 500h': {'horsepower': 366, 'seats': 5, 'cargo_cu_ft': 29.6}}}},
        'UX': {'default_specs': {'horsepower': 169, 'seats': 5, 'cargo_cu_ft': 21.7}, 'years': {(2019, 2025): {'UX 200': {'horsepower': 169, 'seats': 5, 'cargo_cu_ft': 21.7}, 'UX 250h': {'horsepower': 181, 'seats': 5, 'cargo_cu_ft': 21.7}}}}
    },
    'Lincoln': {
        'Aviator': {'default_specs': {'horsepower': 400, 'seats': 7, 'cargo_cu_ft': 18.3}, 'years': {(2020, 2025): {'Aviator Standard': {'horsepower': 400, 'seats': 7, 'cargo_cu_ft': 18.3}, 'Aviator Reserve': {'horsepower': 400, 'seats': 7, 'cargo_cu_ft': 18.3}, 'Aviator Grand Touring': {'horsepower': 494, 'seats': 7, 'cargo_cu_ft': 18.3}}}},
        'Continental': {'default_specs': {'horsepower': 305, 'seats': 5, 'cargo_cu_ft': 14.7}, 'years': {(2017, 2020): {'Continental Select': {'horsepower': 305, 'seats': 5, 'cargo_cu_ft': 14.7}, 'Continental Reserve': {'horsepower': 305, 'seats': 5, 'cargo_cu_ft': 14.7}, 'Continental Black Label': {'horsepower': 400, 'seats': 5, 'cargo_cu_ft': 14.7}}}},
        'Corsair': {'default_specs': {'horsepower': 250, 'seats': 5, 'cargo_cu_ft': 27.6}, 'years': {(2020, 2025): {'Corsair Standard': {'horsepower': 250, 'seats': 5, 'cargo_cu_ft': 27.6}, 'Corsair Reserve': {'horsepower': 250, 'seats': 5, 'cargo_cu_ft': 27.6}, 'Corsair Grand Touring': {'horsepower': 266, 'seats': 5, 'cargo_cu_ft': 27.6}}}},
        'MKC': {'default_specs': {'horsepower': 245, 'seats': 5, 'cargo_cu_ft': 25.2}, 'years': {(2015, 2019): {'MKC Premiere': {'horsepower': 245, 'seats': 5, 'cargo_cu_ft': 25.2}, 'MKC Reserve': {'horsepower': 245, 'seats': 5, 'cargo_cu_ft': 25.2}}}},
        'MKX': {'default_specs': {'horsepower': 303, 'seats': 5, 'cargo_cu_ft': 37.2}, 'years': {(2016, 2018): {'MKX Premiere': {'horsepower': 303, 'seats': 5, 'cargo_cu_ft': 37.2}, 'MKX Reserve': {'horsepower': 303, 'seats': 5, 'cargo_cu_ft': 37.2}}}},
        'MKZ': {'default_specs': {'horsepower': 245, 'seats': 5, 'cargo_cu_ft': 15.4}, 'years': {(2017, 2020): {'MKZ Premiere': {'horsepower': 245, 'seats': 5, 'cargo_cu_ft': 15.4}, 'MKZ Reserve': {'horsepower': 245, 'seats': 5, 'cargo_cu_ft': 15.4}, 'MKZ Reserve II': {'horsepower': 400, 'seats': 5, 'cargo_cu_ft': 15.4}}}},
        'Nautilus': {'default_specs': {'horsepower': 250, 'seats': 5, 'cargo_cu_ft': 37.2}, 'years': {(2019, 2025): {'Nautilus Standard': {'horsepower': 250, 'seats': 5, 'cargo_cu_ft': 37.2}, 'Nautilus Reserve': {'horsepower': 250, 'seats': 5, 'cargo_cu_ft': 37.2}}}},
        'Navigator': {'default_specs': {'horsepower': 440, 'seats': 8, 'cargo_cu_ft': 19.3}, 'years': {(2018, 2025): {'Navigator Standard': {'horsepower': 440, 'seats': 8, 'cargo_cu_ft': 19.3}, 'Navigator Reserve': {'horsepower': 440, 'seats': 7, 'cargo_cu_ft': 19.3}, 'Navigator Black Label': {'horsepower': 440, 'seats': 7, 'cargo_cu_ft': 19.3}}}},
        'Town Car': {'default_specs': {'horsepower': 239, 'seats': 6, 'cargo_cu_ft': 20.6}, 'years': {(2003, 2011): {'Town Car Signature': {'horsepower': 239, 'seats': 6, 'cargo_cu_ft': 20.6}, 'Town Car Executive': {'horsepower': 239, 'seats': 6, 'cargo_cu_ft': 20.6}}}}
    },
    'Mazda': {
        'CX-3': {'default_specs': {'horsepower': 148, 'seats': 5, 'cargo_cu_ft': 12.4}, 'years': {(2016, 2021): {'CX-3 Sport': {'horsepower': 148, 'seats': 5, 'cargo_cu_ft': 12.4}, 'CX-3 Touring': {'horsepower': 148, 'seats': 5, 'cargo_cu_ft': 12.4}, 'CX-3 Grand Touring': {'horsepower': 148, 'seats': 5, 'cargo_cu_ft': 12.4}}}},
        'CX-30': {'default_specs': {'horsepower': 186, 'seats': 5, 'cargo_cu_ft': 20.2}, 'years': {(2020, 2025): {'CX-30 Base': {'horsepower': 186, 'seats': 5, 'cargo_cu_ft': 20.2}, 'CX-30 Select': {'horsepower': 186, 'seats': 5, 'cargo_cu_ft': 20.2}, 'CX-30 Turbo': {'horsepower': 227, 'seats': 5, 'cargo_cu_ft': 20.2}}}},
        'CX-5': {'default_specs': {'horsepower': 187, 'seats': 5, 'cargo_cu_ft': 30.9}, 'years': {(2017, 2025): {'CX-5 S': {'horsepower': 187, 'seats': 5, 'cargo_cu_ft': 30.9}, 'CX-5 S Select': {'horsepower': 187, 'seats': 5, 'cargo_cu_ft': 30.9}, 'CX-5 Turbo': {'horsepower': 256, 'seats': 5, 'cargo_cu_ft': 30.9}}}},
        'CX-50': {'default_specs': {'horsepower': 187, 'seats': 5, 'cargo_cu_ft': 31.4}, 'years': {(2023, 2025): {'CX-50 S': {'horsepower': 187, 'seats': 5, 'cargo_cu_ft': 31.4}, 'CX-50 S Turbo': {'horsepower': 256, 'seats': 5, 'cargo_cu_ft': 31.4}, 'CX-50 Turbo Premium Plus': {'horsepower': 256, 'seats': 5, 'cargo_cu_ft': 31.4}}}},
        'CX-9': {'default_specs': {'horsepower': 227, 'seats': 7, 'cargo_cu_ft': 14.3}, 'years': {(2016, 2023): {'CX-9 Sport': {'horsepower': 227, 'seats': 7, 'cargo_cu_ft': 14.3}, 'CX-9 Touring': {'horsepower': 227, 'seats': 7, 'cargo_cu_ft': 14.3}, 'CX-9 Grand Touring': {'horsepower': 227, 'seats': 7, 'cargo_cu_ft': 14.3}}}},
        'MX-5 Miata': {'default_specs': {'horsepower': 181, 'seats': 2, 'cargo_cu_ft': 4.6}, 'years': {(2016, 2025): {'MX-5 Miata Sport': {'horsepower': 181, 'seats': 2, 'cargo_cu_ft': 4.6}, 'MX-5 Miata Club': {'horsepower': 181, 'seats': 2, 'cargo_cu_ft': 4.6}, 'MX-5 Miata Grand Touring': {'horsepower': 181, 'seats': 2, 'cargo_cu_ft': 4.6}}}},
        'Mazda3': {'default_specs': {'horsepower': 186, 'seats': 5, 'cargo_cu_ft': 13.2}, 'years': {(2019, 2025): {'Mazda3 Base': {'horsepower': 186, 'seats': 5, 'cargo_cu_ft': 13.2}, 'Mazda3 Select': {'horsepower': 186, 'seats': 5, 'cargo_cu_ft': 13.2}, 'Mazda3 Turbo': {'horsepower': 227, 'seats': 5, 'cargo_cu_ft': 13.2}}}},
        'Mazda6': {'default_specs': {'horsepower': 187, 'seats': 5, 'cargo_cu_ft': 14.7}, 'years': {(2014, 2021): {'Mazda6 Sport': {'horsepower': 187, 'seats': 5, 'cargo_cu_ft': 14.7}, 'Mazda6 Touring': {'horsepower': 187, 'seats': 5, 'cargo_cu_ft': 14.7}, 'Mazda6 Grand Touring': {'horsepower': 227, 'seats': 5, 'cargo_cu_ft': 14.7}}}},
        'RX-8': {'default_specs': {'horsepower': 232, 'seats': 4, 'cargo_cu_ft': 7.6}, 'years': {(2004, 2011): {'RX-8 Sport': {'horsepower': 212, 'seats': 4, 'cargo_cu_ft': 7.6}, 'RX-8 Grand Touring': {'horsepower': 232, 'seats': 4, 'cargo_cu_ft': 7.6}}}}
    },
    'Mercedes-Benz': {
        'A-Class': {'default_specs': {'horsepower': 188, 'seats': 5, 'cargo_cu_ft': 14.0}, 'years': {(2019, 2022): {'A 220': {'horsepower': 188, 'seats': 5, 'cargo_cu_ft': 14.0}, 'AMG A 35': {'horsepower': 302, 'seats': 5, 'cargo_cu_ft': 14.0}}}},
        'AMG GT': {'default_specs': {'horsepower': 523, 'seats': 2, 'cargo_cu_ft': 10.1}, 'years': {(2016, 2025): {'AMG GT': {'horsepower': 469, 'seats': 2, 'cargo_cu_ft': 10.1}, 'AMG GT S': {'horsepower': 523, 'seats': 2, 'cargo_cu_ft': 10.1}, 'AMG GT R': {'horsepower': 577, 'seats': 2, 'cargo_cu_ft': 10.1}}}},
        'C-Class': {'default_specs': {'horsepower': 255, 'seats': 5, 'cargo_cu_ft': 12.6}, 'years': {(2022, 2025): {'C 300': {'horsepower': 255, 'seats': 5, 'cargo_cu_ft': 12.6}, 'AMG C 43': {'horsepower': 402, 'seats': 5, 'cargo_cu_ft': 12.6}, 'AMG C 63 S': {'horsepower': 671, 'seats': 5, 'cargo_cu_ft': 12.6}}}},
        'CLA': {'default_specs': {'horsepower': 221, 'seats': 5, 'cargo_cu_ft': 11.6}, 'years': {(2020, 2025): {'CLA 250': {'horsepower': 221, 'seats': 5, 'cargo_cu_ft': 11.6}, 'AMG CLA 35': {'horsepower': 302, 'seats': 5, 'cargo_cu_ft': 11.6}, 'AMG CLA 45': {'horsepower': 382, 'seats': 5, 'cargo_cu_ft': 11.6}}}},
        'E-Class': {'default_specs': {'horsepower': 255, 'seats': 5, 'cargo_cu_ft': 13.1}, 'years': {(2024, 2025): {'E 350': {'horsepower': 255, 'seats': 5, 'cargo_cu_ft': 13.1}, 'E 450': {'horsepower': 375, 'seats': 5, 'cargo_cu_ft': 13.1}, 'AMG E 53': {'horsepower': 429, 'seats': 5, 'cargo_cu_ft': 13.1}}}},
        'G-Class': {'default_specs': {'horsepower': 416, 'seats': 5, 'cargo_cu_ft': 19.4}, 'years': {(2019, 2025): {'G 550': {'horsepower': 416, 'seats': 5, 'cargo_cu_ft': 19.4}, 'AMG G 63': {'horsepower': 577, 'seats': 5, 'cargo_cu_ft': 19.4}}}},
        'GLC': {'default_specs': {'horsepower': 258, 'seats': 5, 'cargo_cu_ft': 19.4}, 'years': {(2023, 2025): {'GLC 300': {'horsepower': 258, 'seats': 5, 'cargo_cu_ft': 19.4}, 'AMG GLC 43': {'horsepower': 416, 'seats': 5, 'cargo_cu_ft': 19.4}, 'AMG GLC 63 S': {'horsepower': 503, 'seats': 5, 'cargo_cu_ft': 19.4}}}},
        'GLS': {'default_specs': {'horsepower': 362, 'seats': 7, 'cargo_cu_ft': 17.4}, 'years': {(2020, 2025): {'GLS 450': {'horsepower': 362, 'seats': 7, 'cargo_cu_ft': 17.4}, 'GLS 580': {'horsepower': 510, 'seats': 7, 'cargo_cu_ft': 17.4}, 'AMG GLS 63': {'horsepower': 603, 'seats': 7, 'cargo_cu_ft': 17.4}}}},
        'S-Class': {'default_specs': {'horsepower': 429, 'seats': 5, 'cargo_cu_ft': 12.9}, 'years': {(2021, 2025): {'S 500': {'horsepower': 429, 'seats': 5, 'cargo_cu_ft': 12.9}, 'S 580': {'horsepower': 496, 'seats': 5, 'cargo_cu_ft': 12.9}, 'AMG S 63': {'horsepower': 791, 'seats': 5, 'cargo_cu_ft': 12.9}}}}
    },
    'Mini': {
        'Clubman': {'default_specs': {'horsepower': 189, 'seats': 5, 'cargo_cu_ft': 17.5}, 'years': {(2016, 2024): {'Clubman Cooper': {'horsepower': 134, 'seats': 5, 'cargo_cu_ft': 17.5}, 'Clubman Cooper S': {'horsepower': 189, 'seats': 5, 'cargo_cu_ft': 17.5}, 'Clubman JCW': {'horsepower': 301, 'seats': 5, 'cargo_cu_ft': 17.5}}}},
        'Cooper': {'default_specs': {'horsepower': 189, 'seats': 4, 'cargo_cu_ft': 8.7}, 'years': {(2014, 2025): {'Cooper': {'horsepower': 134, 'seats': 4, 'cargo_cu_ft': 8.7}, 'Cooper S': {'horsepower': 189, 'seats': 4, 'cargo_cu_ft': 8.7}, 'Cooper JCW': {'horsepower': 228, 'seats': 4, 'cargo_cu_ft': 8.7}}}},
        'Countryman': {'default_specs': {'horsepower': 189, 'seats': 5, 'cargo_cu_ft': 17.6}, 'years': {(2017, 2025): {'Countryman Cooper': {'horsepower': 134, 'seats': 5, 'cargo_cu_ft': 17.6}, 'Countryman Cooper S': {'horsepower': 189, 'seats': 5, 'cargo_cu_ft': 17.6}, 'Countryman JCW': {'horsepower': 301, 'seats': 5, 'cargo_cu_ft': 17.6}}}}
    },
    'Mitsubishi': {
        'Eclipse Cross': {'default_specs': {'horsepower': 152, 'seats': 5, 'cargo_cu_ft': 23.4}, 'years': {(2018, 2025): {'Eclipse Cross ES': {'horsepower': 152, 'seats': 5, 'cargo_cu_ft': 23.4}, 'Eclipse Cross SE': {'horsepower': 152, 'seats': 5, 'cargo_cu_ft': 23.4}, 'Eclipse Cross SEL': {'horsepower': 152, 'seats': 5, 'cargo_cu_ft': 23.4}}}},
        'Mirage': {'default_specs': {'horsepower': 78, 'seats': 5, 'cargo_cu_ft': 17.1}, 'years': {(2014, 2025): {'Mirage ES': {'horsepower': 78, 'seats': 5, 'cargo_cu_ft': 17.1}, 'Mirage LE': {'horsepower': 78, 'seats': 5, 'cargo_cu_ft': 17.1}, 'Mirage SE': {'horsepower': 78, 'seats': 5, 'cargo_cu_ft': 17.1}}}},
        'Outlander': {'default_specs': {'horsepower': 181, 'seats': 7, 'cargo_cu_ft': 33.5}, 'years': {(2022, 2025): {'Outlander ES': {'horsepower': 181, 'seats': 7, 'cargo_cu_ft': 33.5}, 'Outlander SE': {'horsepower': 181, 'seats': 7, 'cargo_cu_ft': 33.5}, 'Outlander SEL': {'horsepower': 181, 'seats': 7, 'cargo_cu_ft': 33.5}}}}
    },
    'Nissan': {
        '370Z': {'default_specs': {'horsepower': 332, 'seats': 2, 'cargo_cu_ft': 6.9}, 'years': {(2009, 2020): {'370Z Base': {'horsepower': 332, 'seats': 2, 'cargo_cu_ft': 6.9}, '370Z Sport': {'horsepower': 332, 'seats': 2, 'cargo_cu_ft': 6.9}, '370Z Nismo': {'horsepower': 350, 'seats': 2, 'cargo_cu_ft': 6.9}}}},
        'Altima': {'default_specs': {'horsepower': 188, 'seats': 5, 'cargo_cu_ft': 15.4}, 'years': {(2019, 2025): {'Altima S': {'horsepower': 188, 'seats': 5, 'cargo_cu_ft': 15.4}, 'Altima SV': {'horsepower': 188, 'seats': 5, 'cargo_cu_ft': 15.4}, 'Altima SR': {'horsepower': 248, 'seats': 5, 'cargo_cu_ft': 15.4}, 'Altima SL': {'horsepower': 188, 'seats': 5, 'cargo_cu_ft': 15.4}}}},
        'Maxima': {'default_specs': {'horsepower': 300, 'seats': 5, 'cargo_cu_ft': 14.3}, 'years': {(2016, 2023): {'Maxima S': {'horsepower': 300, 'seats': 5, 'cargo_cu_ft': 14.3}, 'Maxima SV': {'horsepower': 300, 'seats': 5, 'cargo_cu_ft': 14.3}, 'Maxima SR': {'horsepower': 300, 'seats': 5, 'cargo_cu_ft': 14.3}, 'Maxima Platinum': {'horsepower': 300, 'seats': 5, 'cargo_cu_ft': 14.3}}}},
        'Murano': {'default_specs': {'horsepower': 260, 'seats': 5, 'cargo_cu_ft': 32.1}, 'years': {(2015, 2025): {'Murano S': {'horsepower': 260, 'seats': 5, 'cargo_cu_ft': 32.1}, 'Murano SV': {'horsepower': 260, 'seats': 5, 'cargo_cu_ft': 32.1}, 'Murano SL': {'horsepower': 260, 'seats': 5, 'cargo_cu_ft': 32.1}, 'Murano Platinum': {'horsepower': 260, 'seats': 5, 'cargo_cu_ft': 32.1}}}},
        'Pathfinder': {'default_specs': {'horsepower': 284, 'seats': 8, 'cargo_cu_ft': 16.6}, 'years': {(2022, 2025): {'Pathfinder S': {'horsepower': 284, 'seats': 8, 'cargo_cu_ft': 16.6}, 'Pathfinder SV': {'horsepower': 284, 'seats': 8, 'cargo_cu_ft': 16.6}, 'Pathfinder SL': {'horsepower': 284, 'seats': 7, 'cargo_cu_ft': 16.6}, 'Pathfinder Platinum': {'horsepower': 284, 'seats': 7, 'cargo_cu_ft': 16.6}}}},
        'Rogue': {'default_specs': {'horsepower': 201, 'seats': 5, 'cargo_cu_ft': 36.3}, 'years': {(2021, 2025): {'Rogue S': {'horsepower': 201, 'seats': 5, 'cargo_cu_ft': 36.3}, 'Rogue SV': {'horsepower': 201, 'seats': 5, 'cargo_cu_ft': 36.3}, 'Rogue SL': {'horsepower': 201, 'seats': 5, 'cargo_cu_ft': 36.3}, 'Rogue Platinum': {'horsepower': 201, 'seats': 5, 'cargo_cu_ft': 36.3}}}},
        'Sentra': {'default_specs': {'horsepower': 149, 'seats': 5, 'cargo_cu_ft': 14.3}, 'years': {(2020, 2025): {'Sentra S': {'horsepower': 149, 'seats': 5, 'cargo_cu_ft': 14.3}, 'Sentra SV': {'horsepower': 149, 'seats': 5, 'cargo_cu_ft': 14.3}, 'Sentra SR': {'horsepower': 149, 'seats': 5, 'cargo_cu_ft': 14.3}}}},
        'Titan': {'default_specs': {'horsepower': 400, 'seats': 6, 'cargo_cu_ft': 36.3}, 'years': {(2017, 2025): {'Titan S': {'horsepower': 400, 'seats': 6, 'cargo_cu_ft': 36.3}, 'Titan SV': {'horsepower': 400, 'seats': 6, 'cargo_cu_ft': 36.3}, 'Titan PRO-4X': {'horsepower': 400, 'seats': 5, 'cargo_cu_ft': 36.3}}}}
    },
    'Porsche': {
        '718': {'default_specs': {'horsepower': 300, 'seats': 2, 'cargo_cu_ft': 4.6}, 'years': {(2017, 2025): {'718 Cayman': {'horsepower': 300, 'seats': 2, 'cargo_cu_ft': 9.7}, '718 Cayman S': {'horsepower': 350, 'seats': 2, 'cargo_cu_ft': 9.7}, '718 Cayman GTS': {'horsepower': 394, 'seats': 2, 'cargo_cu_ft': 9.7}, '718 Boxster': {'horsepower': 300, 'seats': 2, 'cargo_cu_ft': 4.6}, '718 Boxster S': {'horsepower': 350, 'seats': 2, 'cargo_cu_ft': 4.6}}}},
        '911': {'default_specs': {'horsepower': 379, 'seats': 4, 'cargo_cu_ft': 4.6}, 'years': {(2020, 2025): {'911 Carrera': {'horsepower': 379, 'seats': 4, 'cargo_cu_ft': 4.6}, '911 Carrera S': {'horsepower': 443, 'seats': 4, 'cargo_cu_ft': 4.6}, '911 Turbo': {'horsepower': 572, 'seats': 4, 'cargo_cu_ft': 4.6}, '911 Turbo S': {'horsepower': 640, 'seats': 4, 'cargo_cu_ft': 4.6}}}},
        'Boxster': {'default_specs': {'horsepower': 300, 'seats': 2, 'cargo_cu_ft': 4.6}, 'years': {(2013, 2016): {'Boxster Base': {'horsepower': 265, 'seats': 2, 'cargo_cu_ft': 4.6}, 'Boxster S': {'horsepower': 315, 'seats': 2, 'cargo_cu_ft': 4.6}, 'Boxster GTS': {'horsepower': 330, 'seats': 2, 'cargo_cu_ft': 4.6}}}},
        'Cayenne': {'default_specs': {'horsepower': 348, 'seats': 5, 'cargo_cu_ft': 27.2}, 'years': {(2019, 2025): {'Cayenne Base': {'horsepower': 348, 'seats': 5, 'cargo_cu_ft': 27.2}, 'Cayenne S': {'horsepower': 434, 'seats': 5, 'cargo_cu_ft': 27.2}, 'Cayenne Turbo': {'horsepower': 541, 'seats': 5, 'cargo_cu_ft': 27.2}}}},
        'Cayman': {'default_specs': {'horsepower': 275, 'seats': 2, 'cargo_cu_ft': 9.7}, 'years': {(2014, 2016): {'Cayman Base': {'horsepower': 275, 'seats': 2, 'cargo_cu_ft': 9.7}, 'Cayman S': {'horsepower': 325, 'seats': 2, 'cargo_cu_ft': 9.7}, 'Cayman GTS': {'horsepower': 340, 'seats': 2, 'cargo_cu_ft': 9.7}}}},
        'Macan': {'default_specs': {'horsepower': 261, 'seats': 5, 'cargo_cu_ft': 17.6}, 'years': {(2019, 2025): {'Macan Base': {'horsepower': 261, 'seats': 5, 'cargo_cu_ft': 17.6}, 'Macan S': {'horsepower': 375, 'seats': 5, 'cargo_cu_ft': 17.6}, 'Macan GTS': {'horsepower': 434, 'seats': 5, 'cargo_cu_ft': 17.6}}}},
        'Panamera': {'default_specs': {'horsepower': 325, 'seats': 5, 'cargo_cu_ft': 17.6}, 'years': {(2017, 2025): {'Panamera Base': {'horsepower': 325, 'seats': 5, 'cargo_cu_ft': 17.6}, 'Panamera 4S': {'horsepower': 434, 'seats': 5, 'cargo_cu_ft': 17.6}, 'Panamera Turbo': {'horsepower': 620, 'seats': 5, 'cargo_cu_ft': 17.6}}}},
        'Taycan': {'default_specs': {'horsepower': 402, 'seats': 5, 'cargo_cu_ft': 14.3}, 'years': {(2020, 2025): {'Taycan Base': {'horsepower': 402, 'seats': 5, 'cargo_cu_ft': 14.3}, 'Taycan 4S': {'horsepower': 482, 'seats': 5, 'cargo_cu_ft': 14.3}, 'Taycan Turbo': {'horsepower': 670, 'seats': 5, 'cargo_cu_ft': 14.3}, 'Taycan Turbo S': {'horsepower': 750, 'seats': 5, 'cargo_cu_ft': 14.3}}}}
    },
    'Ram': {
        '1500': {'default_specs': {'horsepower': 395, 'seats': 6, 'cargo_cu_ft': 61.5}, 'years': {(2019, 2025): {'1500 Tradesman': {'horsepower': 305, 'seats': 6, 'cargo_cu_ft': 61.5}, '1500 Big Horn': {'horsepower': 395, 'seats': 6, 'cargo_cu_ft': 61.5}, '1500 Laramie': {'horsepower': 395, 'seats': 5, 'cargo_cu_ft': 61.5}, '1500 Limited': {'horsepower': 395, 'seats': 5, 'cargo_cu_ft': 61.5}, '1500 TRX': {'horsepower': 702, 'seats': 5, 'cargo_cu_ft': 61.5}}}},
        '2500': {'default_specs': {'horsepower': 410, 'seats': 6, 'cargo_cu_ft': 74.7}, 'years': {(2019, 2025): {'2500 Tradesman': {'horsepower': 410, 'seats': 6, 'cargo_cu_ft': 74.7}, '2500 Big Horn': {'horsepower': 410, 'seats': 6, 'cargo_cu_ft': 74.7}, '2500 Laramie': {'horsepower': 410, 'seats': 6, 'cargo_cu_ft': 74.7}, '2500 Power Wagon': {'horsepower': 410, 'seats': 6, 'cargo_cu_ft': 74.7}}}},
        '3500': {'default_specs': {'horsepower': 410, 'seats': 6, 'cargo_cu_ft': 74.7}, 'years': {(2019, 2025): {'3500 Tradesman': {'horsepower': 410, 'seats': 6, 'cargo_cu_ft': 74.7}, '3500 Big Horn': {'horsepower': 410, 'seats': 6, 'cargo_cu_ft': 74.7}, '3500 Laramie': {'horsepower': 410, 'seats': 6, 'cargo_cu_ft': 74.7}, '3500 Limited': {'horsepower': 410, 'seats': 6, 'cargo_cu_ft': 74.7}}}},
        'ProMaster': {'default_specs': {'horsepower': 276, 'seats': 2, 'cargo_cu_ft': 420.0}, 'years': {(2014, 2025): {'ProMaster 1500': {'horsepower': 276, 'seats': 2, 'cargo_cu_ft': 283.0}, 'ProMaster 2500': {'horsepower': 276, 'seats': 2, 'cargo_cu_ft': 374.0}, 'ProMaster 3500': {'horsepower': 276, 'seats': 2, 'cargo_cu_ft': 420.0}}}}
    },
    'Rivian': {
        'R1S': {'default_specs': {'horsepower': 835, 'seats': 7, 'cargo_cu_ft': 17.0}, 'years': {(2022, 2025): {'R1S Adventure': {'horsepower': 835, 'seats': 7, 'cargo_cu_ft': 17.0}, 'R1S Explore': {'horsepower': 600, 'seats': 7, 'cargo_cu_ft': 17.0}}}},
        'R1T': {'default_specs': {'horsepower': 835, 'seats': 5, 'cargo_cu_ft': 11.0}, 'years': {(2022, 2025): {'R1T Adventure': {'horsepower': 835, 'seats': 5, 'cargo_cu_ft': 11.0}, 'R1T Explore': {'horsepower': 600, 'seats': 5, 'cargo_cu_ft': 11.0}}}},
        'R2': {'default_specs': {'horsepower': 500, 'seats': 5, 'cargo_cu_ft': 30.0}, 'years': {(2026, 2026): {'R2 Base': {'horsepower': 500, 'seats': 5, 'cargo_cu_ft': 30.0}}}}
    },
    'Subaru': {
        'Ascent': {'default_specs': {'horsepower': 260, 'seats': 8, 'cargo_cu_ft': 17.6}, 'years': {(2019, 2025): {'Ascent Base': {'horsepower': 260, 'seats': 8, 'cargo_cu_ft': 17.6}, 'Ascent Premium': {'horsepower': 260, 'seats': 8, 'cargo_cu_ft': 17.6}, 'Ascent Limited': {'horsepower': 260, 'seats': 7, 'cargo_cu_ft': 17.6}, 'Ascent Touring': {'horsepower': 260, 'seats': 7, 'cargo_cu_ft': 17.6}}}},
        'BRZ': {'default_specs': {'horsepower': 228, 'seats': 4, 'cargo_cu_ft': 6.3}, 'years': {(2022, 2025): {'BRZ Premium': {'horsepower': 228, 'seats': 4, 'cargo_cu_ft': 6.3}, 'BRZ Limited': {'horsepower': 228, 'seats': 4, 'cargo_cu_ft': 6.3}}, (2013, 2020): {'BRZ Premium': {'horsepower': 205, 'seats': 4, 'cargo_cu_ft': 6.9}, 'BRZ Limited': {'horsepower': 205, 'seats': 4, 'cargo_cu_ft': 6.9}}}},
        'Crosstrek': {'default_specs': {'horsepower': 182, 'seats': 5, 'cargo_cu_ft': 20.8}, 'years': {(2024, 2025): {'Crosstrek Base': {'horsepower': 152, 'seats': 5, 'cargo_cu_ft': 20.8}, 'Crosstrek Premium': {'horsepower': 152, 'seats': 5, 'cargo_cu_ft': 20.8}, 'Crosstrek Sport': {'horsepower': 182, 'seats': 5, 'cargo_cu_ft': 20.8}, 'Crosstrek Limited': {'horsepower': 182, 'seats': 5, 'cargo_cu_ft': 20.8}}}},
        'Forester': {'default_specs': {'horsepower': 180, 'seats': 5, 'cargo_cu_ft': 28.9}, 'years': {(2019, 2025): {'Forester Base': {'horsepower': 182, 'seats': 5, 'cargo_cu_ft': 28.9}, 'Forester Premium': {'horsepower': 182, 'seats': 5, 'cargo_cu_ft': 28.9}, 'Forester Sport': {'horsepower': 182, 'seats': 5, 'cargo_cu_ft': 28.9}, 'Forester Touring': {'horsepower': 182, 'seats': 5, 'cargo_cu_ft': 28.9}}}},
        'Impreza': {'default_specs': {'horsepower': 152, 'seats': 5, 'cargo_cu_ft': 20.8}, 'years': {(2017, 2025): {'Impreza Base': {'horsepower': 152, 'seats': 5, 'cargo_cu_ft': 20.8}, 'Impreza Premium': {'horsepower': 152, 'seats': 5, 'cargo_cu_ft': 20.8}, 'Impreza Sport': {'horsepower': 152, 'seats': 5, 'cargo_cu_ft': 20.8}}}},
        'Legacy': {'default_specs': {'horsepower': 182, 'seats': 5, 'cargo_cu_ft': 15.1}, 'years': {(2020, 2025): {'Legacy Base': {'horsepower': 182, 'seats': 5, 'cargo_cu_ft': 15.1}, 'Legacy Premium': {'horsepower': 182, 'seats': 5, 'cargo_cu_ft': 15.1}, 'Legacy Sport': {'horsepower': 260, 'seats': 5, 'cargo_cu_ft': 15.1}, 'Legacy Touring XT': {'horsepower': 260, 'seats': 5, 'cargo_cu_ft': 15.1}}}},
        'Outback': {'default_specs': {'horsepower': 182, 'seats': 5, 'cargo_cu_ft': 32.5}, 'years': {(2020, 2025): {'Outback Base': {'horsepower': 182, 'seats': 5, 'cargo_cu_ft': 32.5}, 'Outback Premium': {'horsepower': 182, 'seats': 5, 'cargo_cu_ft': 32.5}, 'Outback Onyx XT': {'horsepower': 260, 'seats': 5, 'cargo_cu_ft': 32.5}, 'Outback Wilderness': {'horsepower': 260, 'seats': 5, 'cargo_cu_ft': 32.5}}}},
        'STI': {'default_specs': {'horsepower': 310, 'seats': 5, 'cargo_cu_ft': 12.3}, 'years': {(2015, 2021): {'STI Base': {'horsepower': 310, 'seats': 5, 'cargo_cu_ft': 12.3}, 'STI Limited': {'horsepower': 310, 'seats': 5, 'cargo_cu_ft': 12.3}}}},
        'Tribeca': {'default_specs': {'horsepower': 256, 'seats': 7, 'cargo_cu_ft': 18.0}, 'years': {(2006, 2014): {'Tribeca Base': {'horsepower': 256, 'seats': 7, 'cargo_cu_ft': 18.0}, 'Tribeca Premium': {'horsepower': 256, 'seats': 7, 'cargo_cu_ft': 18.0}, 'Tribeca Touring': {'horsepower': 256, 'seats': 7, 'cargo_cu_ft': 18.0}}}},
        'WRX': {'default_specs': {'horsepower': 271, 'seats': 5, 'cargo_cu_ft': 12.5}, 'years': {(2022, 2025): {'WRX Base': {'horsepower': 271, 'seats': 5, 'cargo_cu_ft': 12.5}, 'WRX Premium': {'horsepower': 271, 'seats': 5, 'cargo_cu_ft': 12.5}, 'WRX GT': {'horsepower': 271, 'seats': 5, 'cargo_cu_ft': 12.5}}}}
    },
    'Tesla': {
        'Cybertruck': {'default_specs': {'horsepower': 600, 'seats': 5, 'cargo_cu_ft': 68.0}, 'years': {(2024, 2026): {'Cybertruck RWD': {'horsepower': 315, 'seats': 5, 'cargo_cu_ft': 68.0}, 'Cybertruck AWD': {'horsepower': 600, 'seats': 5, 'cargo_cu_ft': 68.0}, 'Cybertruck Cyberbeast': {'horsepower': 845, 'seats': 5, 'cargo_cu_ft': 68.0}}}},
        'Model 3': {'default_specs': {'horsepower': 283, 'seats': 5, 'cargo_cu_ft': 23.0}, 'years': {(2017, 2025): {'Model 3 Standard Range': {'horsepower': 283, 'seats': 5, 'cargo_cu_ft': 23.0}, 'Model 3 Long Range': {'horsepower': 346, 'seats': 5, 'cargo_cu_ft': 23.0}, 'Model 3 Performance': {'horsepower': 455, 'seats': 5, 'cargo_cu_ft': 23.0}}}},
        'Model S': {'default_specs': {'horsepower': 670, 'seats': 5, 'cargo_cu_ft': 28.0}, 'years': {(2021, 2025): {'Model S Standard': {'horsepower': 670, 'seats': 5, 'cargo_cu_ft': 28.0}, 'Model S Plaid': {'horsepower': 1020, 'seats': 5, 'cargo_cu_ft': 28.0}}}},
        'Model X': {'default_specs': {'horsepower': 670, 'seats': 7, 'cargo_cu_ft': 28.0}, 'years': {(2021, 2025): {'Model X Standard': {'horsepower': 670, 'seats': 7, 'cargo_cu_ft': 28.0}, 'Model X Plaid': {'horsepower': 1020, 'seats': 7, 'cargo_cu_ft': 28.0}}}},
        'Model Y': {'default_specs': {'horsepower': 283, 'seats': 5, 'cargo_cu_ft': 30.2}, 'years': {(2020, 2025): {'Model Y Standard Range': {'horsepower': 283, 'seats': 5, 'cargo_cu_ft': 30.2}, 'Model Y Long Range': {'horsepower': 384, 'seats': 7, 'cargo_cu_ft': 30.2}, 'Model Y Performance': {'horsepower': 455, 'seats': 5, 'cargo_cu_ft': 30.2}}}},
        'Roadster': {'default_specs': {'horsepower': 288, 'seats': 2, 'cargo_cu_ft': 6.3}, 'years': {(2008, 2012): {'Roadster Base': {'horsepower': 248, 'seats': 2, 'cargo_cu_ft': 6.3}, 'Roadster Sport': {'horsepower': 288, 'seats': 2, 'cargo_cu_ft': 6.3}}}}
    },
    'Toyota': {
        '4Runner': {'default_specs': {'horsepower': 270, 'seats': 5, 'cargo_cu_ft': 47.2}, 'years': {(2014, 2024): {'4Runner SR5': {'horsepower': 270, 'seats': 5, 'cargo_cu_ft': 47.2}, '4Runner TRD Off-Road': {'horsepower': 270, 'seats': 5, 'cargo_cu_ft': 47.2}, '4Runner TRD Pro': {'horsepower': 270, 'seats': 5, 'cargo_cu_ft': 47.2}, '4Runner Limited': {'horsepower': 270, 'seats': 7, 'cargo_cu_ft': 47.2}}, (2025, 2026): {'4Runner SR5': {'horsepower': 278, 'seats': 5, 'cargo_cu_ft': 43.5}, '4Runner TRD Off-Road': {'horsepower': 278, 'seats': 5, 'cargo_cu_ft': 43.5}, '4Runner TRD Pro': {'horsepower': 326, 'seats': 5, 'cargo_cu_ft': 43.5}}}},
        'Avalon': {'default_specs': {'horsepower': 301, 'seats': 5, 'cargo_cu_ft': 16.1}, 'years': {(2019, 2022): {'Avalon XLE': {'horsepower': 301, 'seats': 5, 'cargo_cu_ft': 16.1}, 'Avalon XSE': {'horsepower': 301, 'seats': 5, 'cargo_cu_ft': 16.1}, 'Avalon Limited': {'horsepower': 301, 'seats': 5, 'cargo_cu_ft': 16.1}, 'Avalon TRD': {'horsepower': 301, 'seats': 5, 'cargo_cu_ft': 16.1}}}},
        'C-HR': {'default_specs': {'horsepower': 144, 'seats': 5, 'cargo_cu_ft': 19.1}, 'years': {(2018, 2022): {'C-HR LE': {'horsepower': 144, 'seats': 5, 'cargo_cu_ft': 19.1}, 'C-HR XLE': {'horsepower': 144, 'seats': 5, 'cargo_cu_ft': 19.1}, 'C-HR Limited': {'horsepower': 144, 'seats': 5, 'cargo_cu_ft': 19.1}}}},
        'Camry': {'default_specs': {'horsepower': 203, 'seats': 5, 'cargo_cu_ft': 15.1}, 'years': {(2018, 2024): {'Camry LE': {'horsepower': 203, 'seats': 5, 'cargo_cu_ft': 15.1}, 'Camry SE': {'horsepower': 203, 'seats': 5, 'cargo_cu_ft': 15.1}, 'Camry XLE': {'horsepower': 301, 'seats': 5, 'cargo_cu_ft': 15.1}, 'Camry TRD': {'horsepower': 301, 'seats': 5, 'cargo_cu_ft': 15.1}}, (2025, 2026): {'Camry LE': {'horsepower': 225, 'seats': 5, 'cargo_cu_ft': 15.1}, 'Camry SE': {'horsepower': 225, 'seats': 5, 'cargo_cu_ft': 15.1}, 'Camry XLE': {'horsepower': 225, 'seats': 5, 'cargo_cu_ft': 15.1}, 'Camry XSE': {'horsepower': 225, 'seats': 5, 'cargo_cu_ft': 15.1}}}},
        'Celica': {'default_specs': {'horsepower': 140, 'seats': 4, 'cargo_cu_ft': 17.5}, 'years': {(2000, 2005): {'Celica GT': {'horsepower': 140, 'seats': 4, 'cargo_cu_ft': 17.5}, 'Celica GT-S': {'horsepower': 180, 'seats': 4, 'cargo_cu_ft': 17.5}}}},
        'Corolla': {'default_specs': {'horsepower': 169, 'seats': 5, 'cargo_cu_ft': 13.1}, 'years': {(2020, 2025): {'Corolla LE': {'horsepower': 169, 'seats': 5, 'cargo_cu_ft': 13.1}, 'Corolla SE': {'horsepower': 169, 'seats': 5, 'cargo_cu_ft': 13.1}, 'Corolla XSE': {'horsepower': 169, 'seats': 5, 'cargo_cu_ft': 13.1}, 'Corolla Hybrid LE': {'horsepower': 138, 'seats': 5, 'cargo_cu_ft': 13.1}}}},
        'GR Supra': {'default_specs': {'horsepower': 382, 'seats': 2, 'cargo_cu_ft': 10.2}, 'years': {(2020, 2025): {'GR Supra 2.0': {'horsepower': 255, 'seats': 2, 'cargo_cu_ft': 10.2}, 'GR Supra 3.0': {'horsepower': 382, 'seats': 2, 'cargo_cu_ft': 10.2}, 'GR Supra 3.0 Premium': {'horsepower': 382, 'seats': 2, 'cargo_cu_ft': 10.2}}}},
        'GR86': {'default_specs': {'horsepower': 228, 'seats': 4, 'cargo_cu_ft': 6.3}, 'years': {(2022, 2025): {'GR86 Base': {'horsepower': 228, 'seats': 4, 'cargo_cu_ft': 6.3}, 'GR86 Premium': {'horsepower': 228, 'seats': 4, 'cargo_cu_ft': 6.3}}}},
        'Highlander': {'default_specs': {'horsepower': 295, 'seats': 8, 'cargo_cu_ft': 16.0}, 'years': {(2020, 2025): {'Highlander L': {'horsepower': 295, 'seats': 8, 'cargo_cu_ft': 16.0}, 'Highlander LE': {'horsepower': 295, 'seats': 8, 'cargo_cu_ft': 16.0}, 'Highlander XLE': {'horsepower': 295, 'seats': 8, 'cargo_cu_ft': 16.0}, 'Highlander Limited': {'horsepower': 295, 'seats': 7, 'cargo_cu_ft': 16.0}, 'Highlander Platinum': {'horsepower': 295, 'seats': 7, 'cargo_cu_ft': 16.0}}}},
        'Land Cruiser': {'default_specs': {'horsepower': 326, 'seats': 5, 'cargo_cu_ft': 26.5}, 'years': {(2024, 2025): {'Land Cruiser 1958': {'horsepower': 326, 'seats': 5, 'cargo_cu_ft': 26.5}, 'Land Cruiser First Edition': {'horsepower': 326, 'seats': 5, 'cargo_cu_ft': 26.5}}, (2008, 2021): {'Land Cruiser Base': {'horsepower': 381, 'seats': 8, 'cargo_cu_ft': 42.0}}}},
        'Matrix': {'default_specs': {'horsepower': 132, 'seats': 5, 'cargo_cu_ft': 19.8}, 'years': {(2009, 2013): {'Matrix L': {'horsepower': 132, 'seats': 5, 'cargo_cu_ft': 19.8}, 'Matrix S': {'horsepower': 158, 'seats': 5, 'cargo_cu_ft': 19.8}}}},
        'Mirai': {'default_specs': {'horsepower': 182, 'seats': 5, 'cargo_cu_ft': 9.6}, 'years': {(2021, 2025): {'Mirai XLE': {'horsepower': 182, 'seats': 5, 'cargo_cu_ft': 9.6}, 'Mirai Limited': {'horsepower': 182, 'seats': 5, 'cargo_cu_ft': 9.6}}}},
        'Prius': {'default_specs': {'horsepower': 194, 'seats': 5, 'cargo_cu_ft': 20.3}, 'years': {(2023, 2025): {'Prius LE': {'horsepower': 194, 'seats': 5, 'cargo_cu_ft': 20.3}, 'Prius XLE': {'horsepower': 194, 'seats': 5, 'cargo_cu_ft': 20.3}, 'Prius Limited': {'horsepower': 194, 'seats': 5, 'cargo_cu_ft': 20.3}, 'Prius Prime SE': {'horsepower': 220, 'seats': 5, 'cargo_cu_ft': 20.3}}}},
        'RAV4': {'default_specs': {'horsepower': 203, 'seats': 5, 'cargo_cu_ft': 37.6}, 'years': {(2019, 2025): {'RAV4 LE': {'horsepower': 203, 'seats': 5, 'cargo_cu_ft': 37.6}, 'RAV4 XLE': {'horsepower': 203, 'seats': 5, 'cargo_cu_ft': 37.6}, 'RAV4 Adventure': {'horsepower': 203, 'seats': 5, 'cargo_cu_ft': 37.6}, 'RAV4 TRD Off-Road': {'horsepower': 203, 'seats': 5, 'cargo_cu_ft': 37.6}, 'RAV4 Hybrid LE': {'horsepower': 219, 'seats': 5, 'cargo_cu_ft': 37.6}, 'RAV4 Prime SE': {'horsepower': 302, 'seats': 5, 'cargo_cu_ft': 33.5}}}},
        'Sequoia': {'default_specs': {'horsepower': 437, 'seats': 8, 'cargo_cu_ft': 11.5}, 'years': {(2023, 2025): {'Sequoia SR5': {'horsepower': 437, 'seats': 8, 'cargo_cu_ft': 11.5}, 'Sequoia Limited': {'horsepower': 437, 'seats': 7, 'cargo_cu_ft': 11.5}, 'Sequoia Platinum': {'horsepower': 437, 'seats': 7, 'cargo_cu_ft': 11.5}, 'Sequoia TRD Pro': {'horsepower': 437, 'seats': 7, 'cargo_cu_ft': 11.5}}}},
        'Sienna': {'default_specs': {'horsepower': 245, 'seats': 8, 'cargo_cu_ft': 33.5}, 'years': {(2021, 2025): {'Sienna LE': {'horsepower': 245, 'seats': 8, 'cargo_cu_ft': 33.5}, 'Sienna XLE': {'horsepower': 245, 'seats': 8, 'cargo_cu_ft': 33.5}, 'Sienna Limited': {'horsepower': 245, 'seats': 7, 'cargo_cu_ft': 33.5}, 'Sienna Platinum': {'horsepower': 245, 'seats': 7, 'cargo_cu_ft': 33.5}}}},
        'Tacoma': {'default_specs': {'horsepower': 278, 'seats': 5, 'cargo_cu_ft': 32.7}, 'years': {(2024, 2026): {'Tacoma SR': {'horsepower': 228, 'seats': 5, 'cargo_cu_ft': 32.7}, 'Tacoma SR5': {'horsepower': 278, 'seats': 5, 'cargo_cu_ft': 32.7}, 'Tacoma TRD Sport': {'horsepower': 278, 'seats': 5, 'cargo_cu_ft': 32.7}, 'Tacoma TRD Off-Road': {'horsepower': 278, 'seats': 5, 'cargo_cu_ft': 32.7}, 'Tacoma TRD Pro': {'horsepower': 278, 'seats': 5, 'cargo_cu_ft': 32.7}}, (2016, 2023): {'Tacoma SR': {'horsepower': 159, 'seats': 5, 'cargo_cu_ft': 32.7}, 'Tacoma SR5': {'horsepower': 278, 'seats': 5, 'cargo_cu_ft': 32.7}, 'Tacoma TRD Pro': {'horsepower': 278, 'seats': 5, 'cargo_cu_ft': 32.7}}}},
        'Tundra': {'default_specs': {'horsepower': 389, 'seats': 5, 'cargo_cu_ft': 32.7}, 'years': {(2022, 2025): {'Tundra SR': {'horsepower': 348, 'seats': 5, 'cargo_cu_ft': 32.7}, 'Tundra SR5': {'horsepower': 389, 'seats': 5, 'cargo_cu_ft': 32.7}, 'Tundra Limited': {'horsepower': 389, 'seats': 5, 'cargo_cu_ft': 32.7}, 'Tundra 1794': {'horsepower': 437, 'seats': 5, 'cargo_cu_ft': 32.7}, 'Tundra TRD Pro': {'horsepower': 437, 'seats': 5, 'cargo_cu_ft': 32.7}}}},
        'Venza': {'default_specs': {'horsepower': 219, 'seats': 5, 'cargo_cu_ft': 28.8}, 'years': {(2021, 2025): {'Venza LE': {'horsepower': 219, 'seats': 5, 'cargo_cu_ft': 28.8}, 'Venza XLE': {'horsepower': 219, 'seats': 5, 'cargo_cu_ft': 28.8}, 'Venza Limited': {'horsepower': 219, 'seats': 5, 'cargo_cu_ft': 28.8}}}}
    },
    'Volkswagen': {
        'Atlas': {'default_specs': {'horsepower': 269, 'seats': 7, 'cargo_cu_ft': 20.6}, 'years': {(2018, 2025): {'Atlas S': {'horsepower': 235, 'seats': 7, 'cargo_cu_ft': 20.6}, 'Atlas SE': {'horsepower': 269, 'seats': 7, 'cargo_cu_ft': 20.6}, 'Atlas SEL': {'horsepower': 269, 'seats': 7, 'cargo_cu_ft': 20.6}, 'Atlas SEL Premium': {'horsepower': 269, 'seats': 7, 'cargo_cu_ft': 20.6}}}},
        'Golf': {'default_specs': {'horsepower': 228, 'seats': 5, 'cargo_cu_ft': 19.9}, 'years': {(2015, 2025): {'Golf TSI': {'horsepower': 170, 'seats': 5, 'cargo_cu_ft': 19.9}, 'Golf GTI': {'horsepower': 228, 'seats': 5, 'cargo_cu_ft': 19.9}, 'Golf R': {'horsepower': 315, 'seats': 5, 'cargo_cu_ft': 19.9}}}},
        'Jetta': {'default_specs': {'horsepower': 158, 'seats': 5, 'cargo_cu_ft': 14.1}, 'years': {(2019, 2025): {'Jetta S': {'horsepower': 158, 'seats': 5, 'cargo_cu_ft': 14.1}, 'Jetta SE': {'horsepower': 158, 'seats': 5, 'cargo_cu_ft': 14.1}, 'Jetta SEL': {'horsepower': 158, 'seats': 5, 'cargo_cu_ft': 14.1}, 'Jetta GLI': {'horsepower': 228, 'seats': 5, 'cargo_cu_ft': 14.1}}}},
        'Passat': {'default_specs': {'horsepower': 174, 'seats': 5, 'cargo_cu_ft': 15.9}, 'years': {(2016, 2022): {'Passat S': {'horsepower': 174, 'seats': 5, 'cargo_cu_ft': 15.9}, 'Passat SE': {'horsepower': 174, 'seats': 5, 'cargo_cu_ft': 15.9}, 'Passat R-Line': {'horsepower': 174, 'seats': 5, 'cargo_cu_ft': 15.9}}}},
        'Tiguan': {'default_specs': {'horsepower': 184, 'seats': 7, 'cargo_cu_ft': 12.0}, 'years': {(2018, 2025): {'Tiguan S': {'horsepower': 184, 'seats': 7, 'cargo_cu_ft': 12.0}, 'Tiguan SE': {'horsepower': 184, 'seats': 7, 'cargo_cu_ft': 12.0}, 'Tiguan SEL': {'horsepower': 184, 'seats': 5, 'cargo_cu_ft': 37.6}, 'Tiguan SEL Premium R-Line': {'horsepower': 184, 'seats': 5, 'cargo_cu_ft': 37.6}}}}
    },
    'Volvo': {
        'S60': {'default_specs': {'horsepower': 247, 'seats': 5, 'cargo_cu_ft': 11.6}, 'years': {(2019, 2025): {'S60 B5 Core': {'horsepower': 247, 'seats': 5, 'cargo_cu_ft': 11.6}, 'S60 B5 Plus': {'horsepower': 247, 'seats': 5, 'cargo_cu_ft': 11.6}, 'S60 T8 Recharge': {'horsepower': 455, 'seats': 5, 'cargo_cu_ft': 11.6}}}},
        'V90': {'default_specs': {'horsepower': 316, 'seats': 5, 'cargo_cu_ft': 19.8}, 'years': {(2017, 2025): {'V90 Cross Country B5': {'horsepower': 247, 'seats': 5, 'cargo_cu_ft': 19.8}, 'V90 Cross Country B6': {'horsepower': 295, 'seats': 5, 'cargo_cu_ft': 19.8}}}},
        'XC40': {'default_specs': {'horsepower': 247, 'seats': 5, 'cargo_cu_ft': 20.7}, 'years': {(2019, 2025): {'XC40 B4 Core': {'horsepower': 194, 'seats': 5, 'cargo_cu_ft': 20.7}, 'XC40 B5 Plus': {'horsepower': 247, 'seats': 5, 'cargo_cu_ft': 20.7}, 'XC40 Recharge Pure Electric': {'horsepower': 402, 'seats': 5, 'cargo_cu_ft': 20.7}}}},
        'XC60': {'default_specs': {'horsepower': 247, 'seats': 5, 'cargo_cu_ft': 22.4}, 'years': {(2018, 2025): {'XC60 B5 Core': {'horsepower': 247, 'seats': 5, 'cargo_cu_ft': 22.4}, 'XC60 B5 Plus': {'horsepower': 247, 'seats': 5, 'cargo_cu_ft': 22.4}, 'XC60 B6 Ultimate': {'horsepower': 295, 'seats': 5, 'cargo_cu_ft': 22.4}, 'XC60 T8 Recharge': {'horsepower': 455, 'seats': 5, 'cargo_cu_ft': 22.4}}}},
        'XC90': {'default_specs': {'horsepower': 247, 'seats': 7, 'cargo_cu_ft': 15.8}, 'years': {(2016, 2025): {'XC90 B5 Core': {'horsepower': 247, 'seats': 7, 'cargo_cu_ft': 15.8}, 'XC90 B5 Plus': {'horsepower': 247, 'seats': 7, 'cargo_cu_ft': 15.8}, 'XC90 B6 Ultimate': {'horsepower': 295, 'seats': 7, 'cargo_cu_ft': 15.8}, 'XC90 T8 Recharge': {'horsepower': 455, 'seats': 7, 'cargo_cu_ft': 15.8}}}}
    }
}


def get_vehicle_specs(make, model, year, trim=None):
    """Get vehicle specifications from the database.
    
    Args:
        make: Vehicle manufacturer (e.g., 'Toyota')
        model: Vehicle model (e.g., 'Camry')
        year: Model year (int)
        trim: Optional trim level (e.g., 'Camry LE')
    
    Returns:
        Dict with horsepower, mpg_combined, seats, cargo_cu_ft, source
        or None if vehicle not found
    """
    make_data = VEHICLE_SPECS_DATABASE.get(make)
    if not make_data:
        # Try case-insensitive match
        for k in VEHICLE_SPECS_DATABASE:
            if k.lower() == make.lower():
                make_data = VEHICLE_SPECS_DATABASE[k]
                break
    if not make_data:
        return _estimate_specs_by_category(make, model, year)
    
    model_data = make_data.get(model)
    if not model_data:
        for k in make_data:
            if k.lower() == model.lower():
                model_data = make_data[k]
                break
    if not model_data:
        return _estimate_specs_by_category(make, model, year)
    
    # Find the right year range
    specs = None
    years_data = model_data.get('years', {})
    for (start_year, end_year), trims in years_data.items():
        if start_year <= year <= end_year:
            if trim and trim in trims:
                specs = trims[trim].copy()
            elif trim:
                # Try partial match on trim name
                for t_name, t_specs in trims.items():
                    if trim.lower() in t_name.lower() or t_name.lower() in trim.lower():
                        specs = t_specs.copy()
                        break
            if not specs:
                # Use first trim as default for the year range
                first_trim = next(iter(trims.values()))
                specs = first_trim.copy() if isinstance(first_trim, dict) else None
            break
    
    if not specs:
        # Fall back to default_specs
        default = model_data.get('default_specs')
        if default:
            specs = default.copy()
        else:
            return _estimate_specs_by_category(make, model, year)
    
    # Get MPG from the MPG database
    mpg_combined = 0
    try:
        from vehicle_mpg_database import get_vehicle_mpg
        mpg_data = get_vehicle_mpg(make, model, year, trim)
        if mpg_data and mpg_data.get('combined'):
            mpg_combined = mpg_data['combined']
    except Exception:
        pass
    
    return {
        'horsepower': specs.get('horsepower', 0),
        'mpg_combined': mpg_combined,
        'seats': specs.get('seats', 0),
        'cargo_cu_ft': specs.get('cargo_cu_ft', 0.0),
        'source': 'database'
    }


def _estimate_specs_by_category(make, model, year):
    """Estimate specs based on vehicle category when exact data is unavailable."""
    model_lower = model.lower()
    
    # Try to determine category from model name keywords
    if any(kw in model_lower for kw in ['truck', 'f-150', 'f-250', 'f-350', 'silverado', 'sierra', 'titan', 'tundra', 'tacoma', 'ranger', 'colorado', 'canyon', 'gladiator', 'frontier', 'ridgeline', 'ram', '1500', '2500', '3500', 'cybertruck', 'r1t', 'maverick']):
        return {'horsepower': 300, 'mpg_combined': 22, 'seats': 5, 'cargo_cu_ft': 50.0, 'source': 'estimated_truck'}
    elif any(kw in model_lower for kw in ['suv', 'explorer', 'tahoe', 'suburban', 'expedition', 'yukon', 'sequoia', 'land cruiser', 'armada', 'navigator', 'escalade', 'r1s']):
        return {'horsepower': 350, 'mpg_combined': 20, 'seats': 7, 'cargo_cu_ft': 30.0, 'source': 'estimated_large_suv'}
    elif any(kw in model_lower for kw in ['pilot', 'highlander', 'pathfinder', 'atlas', 'telluride', 'palisade', 'ascent', 'cx-9', 'traverse', 'enclave', 'aviator', 'xt6']):
        return {'horsepower': 280, 'mpg_combined': 24, 'seats': 7, 'cargo_cu_ft': 18.0, 'source': 'estimated_mid_suv'}
    elif any(kw in model_lower for kw in ['rav4', 'cr-v', 'rogue', 'tucson', 'cx-5', 'forester', 'outback', 'sportage', 'equinox', 'escape', 'tiguan', 'crosstrek', 'seltos', 'corsair', 'nautilus', 'nx', 'rdx', 'glc', 'x3', 'xc60', 'macan', 'q5', 'eclipse cross', 'outlander', 'cx-30', 'cx-50']):
        return {'horsepower': 190, 'mpg_combined': 29, 'seats': 5, 'cargo_cu_ft': 30.0, 'source': 'estimated_compact_suv'}
    elif any(kw in model_lower for kw in ['van', 'sienna', 'odyssey', 'pacifica', 'carnival', 'promaster', 'transit']):
        return {'horsepower': 260, 'mpg_combined': 22, 'seats': 7, 'cargo_cu_ft': 33.0, 'source': 'estimated_van'}
    elif any(kw in model_lower for kw in ['sports', 'coupe', 'mustang', 'camaro', 'corvette', 'supra', 'brz', '86', 'miata', '370z', '911', 'boxster', 'cayman', 'amg gt', 'stinger', 'wrx', 'sti', 'rx-8', 'celica', 'roadster']):
        return {'horsepower': 300, 'mpg_combined': 25, 'seats': 4, 'cargo_cu_ft': 8.0, 'source': 'estimated_sports'}
    elif any(kw in model_lower for kw in ['sedan', 'camry', 'accord', 'altima', 'civic', 'corolla', 'sonata', 'elantra', 'jetta', 'mazda3', 'mazda6', 'impreza', 'legacy', 'passat', 'sentra']):
        return {'horsepower': 180, 'mpg_combined': 32, 'seats': 5, 'cargo_cu_ft': 14.0, 'source': 'estimated_sedan'}
    elif any(kw in model_lower for kw in ['model 3', 'model s', 'model x', 'model y', 'taycan', 'mach-e', 'ioniq', 'ev6', 'id.4', 'leaf', 'bolt', 'polestar', 'recharge']):
        return {'horsepower': 350, 'mpg_combined': 0, 'seats': 5, 'cargo_cu_ft': 25.0, 'source': 'estimated_ev'}
    elif any(kw in model_lower for kw in ['luxury', 'ls', 'es', 's-class', '7 series', 'a8', 'ct5', 'genesis', 'continental', 'town car', 'avalon', 'maxima']):
        return {'horsepower': 350, 'mpg_combined': 25, 'seats': 5, 'cargo_cu_ft': 15.0, 'source': 'estimated_luxury'}
    
    # Generic fallback
    return {'horsepower': 200, 'mpg_combined': 28, 'seats': 5, 'cargo_cu_ft': 15.0, 'source': 'estimated_generic'}


def get_specs_display_text(specs):
    """Format specs for display as a readable string."""
    if not specs:
        return 'No specs available'
    
    parts = []
    if specs.get('horsepower', 0) > 0:
        parts.append(f"{specs['horsepower']} hp")
    if specs.get('mpg_combined', 0) > 0:
        parts.append(f"{specs['mpg_combined']} MPG")
    if specs.get('seats', 0) > 0:
        parts.append(f"{specs['seats']} seats")
    if specs.get('cargo_cu_ft', 0) > 0:
        parts.append(f"{specs['cargo_cu_ft']} cu ft cargo")
    
    return ' | '.join(parts) if parts else 'No specs available'


def compare_vehicle_specs(vehicles_specs):
    """Compare specs across multiple vehicles and return rankings.
    
    Args:
        vehicles_specs: List of dicts with 'name' and 'specs' keys
    
    Returns:
        Dict with rankings by each spec category
    """
    valid = [v for v in vehicles_specs if v.get('specs')]
    if not valid:
        return {}
    
    rankings = {}
    for field, label, reverse in [
        ('horsepower', 'Most Powerful', True),
        ('mpg_combined', 'Best Fuel Economy', True),
        ('seats', 'Most Seating', True),
        ('cargo_cu_ft', 'Most Cargo Space', True)
    ]:
        filtered = [v for v in valid if v['specs'].get(field, 0) > 0]
        if filtered:
            ranked = sorted(filtered, key=lambda x: x['specs'][field], reverse=reverse)
            rankings[label] = ranked
    
    return rankings
