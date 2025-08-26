# Get material information
The /materials/v1 API endpoint gives you access to up-to-date information about Shapeways’ materials. Similar information can be found https://www.shapeways.com/materials

Request (with API Token added already)
> IMPORTANT: Do NOT commit real access tokens. Use OAuth2 Client Credentials at runtime to obtain a short-lived access_token.
```bash
curl -X GET \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  https://api.shapeways.com/materials/v1
```

Response
```json
{
  "result": "success",
  "materials": {
    "6": {
      "materialId": "6",
      "title": "SLS - Nylon PA12 - White",
      "supportsColorFiles": false,
      "printerId": "5",
      "swatch": "https://www.shapeways.com/rrstatic/img/materials/plastic_wsf_white.jpg",
      "restrictions": null
    },
    "25": {
      "materialId": "25",
      "title": "SLS - Nylon PA12 - Black Dyed",
      "supportsColorFiles": false,
      "printerId": "15",
      "swatch": "https://www.shapeways.com/rrstatic/img/materials/plastic_wsf_black.jpg",
      "restrictions": null
    },
    "53": {
      "materialId": "53",
      "title": "Casting - Silver - Natural",
      "supportsColorFiles": false,
      "printerId": "9",
      "swatch": "https://www.shapeways.com/files/cms/materials/swatches/Natural.jpg",
      "restrictions": {
        "5": {
          "restrictionId": "5",
          "restrictionName": "Block Ship To Country",
          "restrictionEntityIds": [
            "204",
            "243",
            "221",
            "215",
            "154",
            "127",
            "98",
            "15"
          ]
        }
      }
    },
    "54": {
      "materialId": "54",
      "title": "Casting - Silver - Polished",
      "supportsColorFiles": false,
      "printerId": "9",
      "swatch": "https://www.shapeways.com/files/cms/materials/swatches/Polished.jpg",
      "restrictions": {
        "5": {
          "restrictionId": "5",
          "restrictionName": "Block Ship To Country",
          "restrictionEntityIds": [
            "204",
            "243",
            "221",
            "215",
            "154",
            "127",
            "98",
            "15"
          ]
        }
      }
    },
    "60": {
      "materialId": "60",
      "title": "MJP - Visijet - M2P Crystal UHD",
      "supportsColorFiles": false,
      "printerId": "72",
      "swatch": "https://www.shapeways.com/files/cms/materials/swatches/Crystal%20M2%20Swatch.png",
      "restrictions": null
    },
    "75": {
      "materialId": "75",
      "title": "SLS - Nylon PA12 - Purple Dyed",
      "supportsColorFiles": false,
      "printerId": "15",
      "swatch": "https://www.shapeways.com/rrstatic/img/materials/swatch-violet-purple.jpg",
      "restrictions": null
    },
    "76": {
      "materialId": "76",
      "title": "SLS - Nylon PA12 - Red Dyed",
      "supportsColorFiles": false,
      "printerId": "15",
      "swatch": "https://www.shapeways.com/rrstatic/img/materials/swatch-coral-red.jpg",
      "restrictions": null
    },
    "77": {
      "materialId": "77",
      "title": "SLS - Nylon PA12 - Pink Dyed",
      "supportsColorFiles": false,
      "printerId": "15",
      "swatch": "https://www.shapeways.com/rrstatic/img/materials/swatch-pink-20140702.png",
      "restrictions": null
    },
    "78": {
      "materialId": "78",
      "title": "SLS - Nylon PA12 - Blue Dyed",
      "supportsColorFiles": false,
      "printerId": "15",
      "swatch": "https://www.shapeways.com/rrstatic/img/materials/swatch-royal-blue.jpg",
      "restrictions": null
    },
    "84": {
      "materialId": "84",
      "title": "Casting - Brass - Natural",
      "supportsColorFiles": false,
      "printerId": "25",
      "swatch": "https://www.shapeways.com/rrstatic/img/materials/swatch-raw-brass-20140116.png",
      "restrictions": {
        "5": {
          "restrictionId": "5",
          "restrictionName": "Block Ship To Country",
          "restrictionEntityIds": [
            "243",
            "221",
            "215",
            "154",
            "127",
            "98",
            "15"
          ]
        }
      }
    },
    "85": {
      "materialId": "85",
      "title": "Casting - Brass - Polished",
      "supportsColorFiles": false,
      "printerId": "25",
      "swatch": "https://www.shapeways.com/rrstatic/img/materials/swatch-polished-brass-20140116.png",
      "restrictions": {
        "5": {
          "restrictionId": "5",
          "restrictionName": "Block Ship To Country",
          "restrictionEntityIds": [
            "243",
            "221",
            "215",
            "154",
            "127",
            "98",
            "15"
          ]
        }
      }
    },
    "86": {
      "materialId": "86",
      "title": "Casting - Bronze - Natural",
      "supportsColorFiles": false,
      "printerId": "25",
      "swatch": "https://www.shapeways.com/rrstatic/img/materials/swatch-raw-bronze-20140116.png",
      "restrictions": {
        "5": {
          "restrictionId": "5",
          "restrictionName": "Block Ship To Country",
          "restrictionEntityIds": [
            "243",
            "221",
            "215",
            "154",
            "127",
            "98",
            "15"
          ]
        }
      }
    },
    "87": {
      "materialId": "87",
      "title": "Casting - Bronze - Polished",
      "supportsColorFiles": false,
      "printerId": "25",
      "swatch": "https://www.shapeways.com/rrstatic/img/materials/swatch-polished-bronze-20140702.png",
      "restrictions": {
        "5": {
          "restrictionId": "5",
          "restrictionName": "Block Ship To Country",
          "restrictionEntityIds": [
            "243",
            "221",
            "215",
            "154",
            "127",
            "98",
            "15"
          ]
        }
      }
    },
    "91": {
      "materialId": "91",
      "title": "Casting - Gold - 14K Yellow",
      "supportsColorFiles": false,
      "printerId": "9",
      "swatch": "https://www.shapeways.com/rrstatic/img/materials/swatch-14k-gold-20140702.png",
      "restrictions": {
        "5": {
          "restrictionId": "5",
          "restrictionName": "Block Ship To Country",
          "restrictionEntityIds": [
            "204",
            "243",
            "221",
            "215",
            "154",
            "127",
            "98",
            "15"
          ]
        }
      }
    },
    "93": {
      "materialId": "93",
      "title": "SLS - Nylon PA12 - Yellow Dyed",
      "supportsColorFiles": false,
      "printerId": "15",
      "swatch": "https://www.shapeways.com/rrstatic/img/materials/VP-Smooth-Swatch-Yellow.jpg",
      "restrictions": null
    },
    "94": {
      "materialId": "94",
      "title": "SLS - Nylon PA12 - Green Dyed",
      "supportsColorFiles": false,
      "printerId": "15",
      "swatch": "https://www.shapeways.com/rrstatic/img/materials/swatch-green.png",
      "restrictions": null
    },
    "95": {
      "materialId": "95",
      "title": "SLS - Nylon PA12 - Orange Dyed",
      "supportsColorFiles": false,
      "printerId": "15",
      "swatch": "https://www.shapeways.com/rrstatic/img/materials/swatch-orange.png",
      "restrictions": null
    },
    "96": {
      "materialId": "96",
      "title": "Casting - Gold - 14K Rose",
      "supportsColorFiles": false,
      "printerId": "9",
      "swatch": "https://www.shapeways.com/rrstatic/img/materials/swatch-rose-gold-20150206.png",
      "restrictions": {
        "5": {
          "restrictionId": "5",
          "restrictionName": "Block Ship To Country",
          "restrictionEntityIds": [
            "204",
            "243",
            "221",
            "215",
            "154",
            "127",
            "98",
            "15"
          ]
        }
      }
    },
    "97": {
      "materialId": "97",
      "title": "Casting - Gold - 14K White",
      "supportsColorFiles": false,
      "printerId": "9",
      "swatch": "https://www.shapeways.com/rrstatic/img/materials/swatch-white-gold-20150206.png",
      "restrictions": {
        "5": {
          "restrictionId": "5",
          "restrictionName": "Block Ship To Country",
          "restrictionEntityIds": [
            "204",
            "243",
            "221",
            "215",
            "154",
            "127",
            "98",
            "15"
          ]
        }
      }
    },
    "98": {
      "materialId": "98",
      "title": "Casting - Gold - 18K Yellow",
      "supportsColorFiles": false,
      "printerId": "9",
      "swatch": "https://www.shapeways.com/rrstatic/img/materials/swatch-18k-gold-20150206.png",
      "restrictions": {
        "5": {
          "restrictionId": "5",
          "restrictionName": "Block Ship To Country",
          "restrictionEntityIds": [
            "204",
            "243",
            "221",
            "215",
            "154",
            "127",
            "98",
            "15"
          ]
        }
      }
    },
    "110": {
      "materialId": "110",
      "title": "Casting - Brass - 14K Gold Plated",
      "supportsColorFiles": false,
      "printerId": "25",
      "swatch": "https://www.shapeways.com/rrstatic/img/materials/swatch-plated-brass-14k.png",
      "restrictions": {
        "5": {
          "restrictionId": "5",
          "restrictionName": "Block Ship To Country",
          "restrictionEntityIds": [
            "243",
            "221",
            "215",
            "154",
            "127",
            "98",
            "15"
          ]
        }
      }
    },
    "111": {
      "materialId": "111",
      "title": "Casting - Brass - 14K Rose Gold Plated",
      "supportsColorFiles": false,
      "printerId": "25",
      "swatch": "https://www.shapeways.com/rrstatic/img/materials/swatch-plated-brass-14k-rose.png",
      "restrictions": {
        "5": {
          "restrictionId": "5",
          "restrictionName": "Block Ship To Country",
          "restrictionEntityIds": [
            "243",
            "221",
            "215",
            "154",
            "127",
            "98",
            "15"
          ]
        }
      }
    },
    "112": {
      "materialId": "112",
      "title": "Casting - Brass - 18K Gold Plated",
      "supportsColorFiles": false,
      "printerId": "25",
      "swatch": "https://www.shapeways.com/rrstatic/img/materials/swatch-plated-brass-18k.png",
      "restrictions": {
        "5": {
          "restrictionId": "5",
          "restrictionName": "Block Ship To Country",
          "restrictionEntityIds": [
            "243",
            "221",
            "215",
            "154",
            "127",
            "98",
            "15"
          ]
        }
      }
    },
    "113": {
      "materialId": "113",
      "title": "Casting - Brass - Rhodium Plated",
      "supportsColorFiles": false,
      "printerId": "25",
      "swatch": "https://www.shapeways.com/rrstatic/img/materials/swatch-plated-brass-rhodium.png",
      "restrictions": {
        "5": {
          "restrictionId": "5",
          "restrictionName": "Block Ship To Country",
          "restrictionEntityIds": [
            "243",
            "221",
            "215",
            "154",
            "127",
            "98",
            "15"
          ]
        }
      }
    },
    "130": {
      "materialId": "130",
      "title": "MJF - Nylon PA12 - Gray",
      "supportsColorFiles": false,
      "printerId": "36",
      "swatch": "https://www.shapeways.com/rrstatic/img/materials/swatch-bsf-gray.png",
      "restrictions": null
    },
    "131": {
      "materialId": "131",
      "title": "MJF - Nylon PA12 - Black",
      "supportsColorFiles": false,
      "printerId": "37",
      "swatch": "https://www.shapeways.com/rrstatic/img/materials/plastic_wsf_black.jpg",
      "restrictions": null
    },
    "145": {
      "materialId": "145",
      "title": "MJF - Nylon PA12GB - Gray",
      "supportsColorFiles": false,
      "printerId": "42",
      "swatch": "https://www.shapeways.com/rrstatic/img/materials/Swatch%20-%20Grey%20PA12GB.png",
      "restrictions": null
    },
    "150": {
      "materialId": "150",
      "title": "MJF - Nylon PA12 - Black Vapor Smoothing",
      "supportsColorFiles": false,
      "printerId": "8",
      "swatch": "https://www.shapeways.com/rrstatic/img/materials/plastic_wsf_black.jpg",
      "restrictions": null
    },
    "156": {
      "materialId": "156",
      "title": "Casting - Copper - Natural",
      "supportsColorFiles": false,
      "printerId": "25",
      "swatch": "https://www.shapeways.com/files/cms/materials/swatches/swatch-copper.jpg",
      "restrictions": null
    },
    "157": {
      "materialId": "157",
      "title": "Casting - Copper - Polished",
      "supportsColorFiles": false,
      "printerId": "25",
      "swatch": "https://www.shapeways.com/files/cms/materials/swatches/swatch-copper.jpg",
      "restrictions": null
    },
    "207": {
      "materialId": "207",
      "title": "SLS - Nylon PA12 - White Vapor Smoothing",
      "supportsColorFiles": false,
      "printerId": "63",
      "swatch": "https://www.shapeways.com/rrstatic/img/materials/vp_smooth_w.jpg",
      "restrictions": null
    },
    "208": {
      "materialId": "208",
      "title": "SLS - Nylon PA12 - Black Vapor Smoothing",
      "supportsColorFiles": false,
      "printerId": "71",
      "swatch": "https://www.shapeways.com/rrstatic/img/materials/vp_smooth_b.jpg",
      "restrictions": null
    },
    "222": {
      "materialId": "222",
      "title": "BJT - Stainless Steel 316L",
      "supportsColorFiles": false,
      "printerId": "64",
      "swatch": "https://www.shapeways.com/files/cms/materials/swatches/swatch-stainless-steel.png",
      "restrictions": null
    },
    "223": {
      "materialId": "223",
      "title": "BJT - Stainless Steel 17-4 BJT",
      "supportsColorFiles": false,
      "printerId": "64",
      "swatch": "https://www.shapeways.com/files/cms/materials/swatches/swatch-stainless-steel.png",
      "restrictions": null
    },
    "231": {
      "materialId": "231",
      "title": "MJF - Full Color Nylon PA12 - Standard",
      "supportsColorFiles": true,
      "printerId": "67",
      "swatch": "https://www.shapeways.com/rrstatic/img/materials/sandstone_full_color.jpg",
      "restrictions": null
    },
    "232": {
      "materialId": "232",
      "title": "MJF - Full Color Nylon PA12 - Smooth",
      "supportsColorFiles": true,
      "printerId": "68",
      "swatch": "https://www.shapeways.com/files/cms/materials/coated-sandstone_full_color.jpg",
      "restrictions": null
    },
    "236": {
      "materialId": "236",
      "title": "SLS - Nylon PA12 - Blue Vapor Smoothing",
      "supportsColorFiles": false,
      "printerId": "8",
      "swatch": "https://www.shapeways.com/rrstatic/img/materials/VP-Smooth-Swatch-Blue.jpg",
      "restrictions": null
    },
    "237": {
      "materialId": "237",
      "title": "SLS - Nylon PA12 - Red Vapor Smoothing",
      "supportsColorFiles": false,
      "printerId": "8",
      "swatch": "https://www.shapeways.com/rrstatic/img/materials/VP-Smooth-Swatch-Red.jpg",
      "restrictions": null
    },
    "238": {
      "materialId": "238",
      "title": "SLS - Nylon PA12 - Yellow Vapor Smoothing",
      "supportsColorFiles": false,
      "printerId": "8",
      "swatch": "https://www.shapeways.com/rrstatic/img/materials/VP-Smooth-Swatch-Yellow.jpg",
      "restrictions": null
    },
    "239": {
      "materialId": "239",
      "title": "SLS - Nylon PA12 - Orange Vapor Smoothing",
      "supportsColorFiles": false,
      "printerId": "8",
      "swatch": "https://www.shapeways.com/rrstatic/img/materials/VP-Smooth-Swatch-Orange.jpg",
      "restrictions": null
    },
    "240": {
      "materialId": "240",
      "title": "SLS - Nylon PA12 - Green Vapor Smoothing",
      "supportsColorFiles": false,
      "printerId": "8",
      "swatch": "https://www.shapeways.com/rrstatic/img/materials/VP-Smooth-Swatch-Green.jpg",
      "restrictions": null
    },
    "241": {
      "materialId": "241",
      "title": "SLS - Nylon PA12 - Purple Vapor Smoothing",
      "supportsColorFiles": false,
      "printerId": "8",
      "swatch": "https://www.shapeways.com/rrstatic/img/materials/VP-Smooth-Swatch-Purple.jpg",
      "restrictions": null
    },
    "242": {
      "materialId": "242",
      "title": "SLS - Nylon PA12 - Pink Vapor Smoothing",
      "supportsColorFiles": false,
      "printerId": "8",
      "swatch": "https://www.shapeways.com/rrstatic/img/materials/VP-Smooth-Swatch-Pink.jpg",
      "restrictions": null
    },
    "244": {
      "materialId": "244",
      "title": "SLS - TPE - White",
      "supportsColorFiles": false,
      "printerId": "48",
      "swatch": "https://www.shapeways.com/rrstatic/img/materials/plastic_wsf_white.jpg",
      "restrictions": null
    },
    "245": {
      "materialId": "245",
      "title": "SLS - TPE - Black",
      "supportsColorFiles": false,
      "printerId": "48",
      "swatch": "https://www.shapeways.com/rrstatic/img/materials/plastic_wsf_black.jpg",
      "restrictions": null
    },
    "249": {
      "materialId": "249",
      "title": "Casting - Vermeil",
      "supportsColorFiles": false,
      "printerId": "9",
      "swatch": "https://www.shapeways.com/rrstatic/img/materials/swatch-18k-gold-20150206.png",
      "restrictions": null
    },
    "250": {
      "materialId": "250",
      "title": "MJP - Visijet - M2R Tan HD",
      "supportsColorFiles": false,
      "printerId": "72",
      "swatch": "https://www.shapeways.com/rrstatic/img/materials/tan-fdp.jpg",
      "restrictions": null
    },
    "252": {
      "materialId": "252",
      "title": "MJP - Visijet - M2R Clear UHD",
      "supportsColorFiles": false,
      "printerId": "73",
      "swatch": "https://www.shapeways.com/rrstatic/img/materials/FDP-Clear-UHD-Swatch.jpg",
      "restrictions": null
    },
    "273": {
      "materialId": "273",
      "title": "FDM - ABS - Black - 15%",
      "supportsColorFiles": false,
      "printerId": "82",
      "swatch": "https://www.shapeways.com/rrstatic/img/materials/plastic_wsf_black.jpg",
      "restrictions": null
    },
    "274": {
      "materialId": "274",
      "title": "FDM - ABS - Black - 35%",
      "supportsColorFiles": false,
      "printerId": "82",
      "swatch": "https://www.shapeways.com/rrstatic/img/materials/plastic_wsf_black.jpg",
      "restrictions": null
    },
    "275": {
      "materialId": "275",
      "title": "FDM - ABS - Black - 70%",
      "supportsColorFiles": false,
      "printerId": "82",
      "swatch": "https://www.shapeways.com/rrstatic/img/materials/plastic_wsf_black.jpg",
      "restrictions": null
    },
    "276": {
      "materialId": "276",
      "title": "FDM - ABS - Black - 100%",
      "supportsColorFiles": false,
      "printerId": "82",
      "swatch": "https://www.shapeways.com/rrstatic/img/materials/plastic_wsf_black.jpg",
      "restrictions": null
    },
    "277": {
      "materialId": "277",
      "title": "FDM - ABS - White - 15%",
      "supportsColorFiles": false,
      "printerId": "82",
      "swatch": "https://www.shapeways.com/rrstatic/img/materials/plastic_wsf_white.jpg",
      "restrictions": null
    },
    "278": {
      "materialId": "278",
      "title": "FDM - ABS - White - 35%",
      "supportsColorFiles": false,
      "printerId": "82",
      "swatch": "https://www.shapeways.com/rrstatic/img/materials/plastic_wsf_white.jpg",
      "restrictions": null
    },
    "279": {
      "materialId": "279",
      "title": "FDM - ABS - White - 70%",
      "supportsColorFiles": false,
      "printerId": "82",
      "swatch": "https://www.shapeways.com/rrstatic/img/materials/plastic_wsf_white.jpg",
      "restrictions": null
    },
    "280": {
      "materialId": "280",
      "title": "FDM - ABS - White - 100%",
      "supportsColorFiles": false,
      "printerId": "82",
      "swatch": "https://www.shapeways.com/rrstatic/img/materials/plastic_wsf_white.jpg",
      "restrictions": null
    },
    "283": {
      "materialId": "283",
      "title": "FDM - ASA - Black - 15%",
      "supportsColorFiles": false,
      "printerId": "82",
      "swatch": "https://www.shapeways.com/rrstatic/img/materials/plastic_wsf_black.jpg",
      "restrictions": null
    },
    "284": {
      "materialId": "284",
      "title": "FDM - ASA - Black - 35%",
      "supportsColorFiles": false,
      "printerId": "82",
      "swatch": "https://www.shapeways.com/rrstatic/img/materials/plastic_wsf_black.jpg",
      "restrictions": null
    },
    "285": {
      "materialId": "285",
      "title": "FDM - ASA - Black - 70%",
      "supportsColorFiles": false,
      "printerId": "82",
      "swatch": "https://www.shapeways.com/rrstatic/img/materials/plastic_wsf_black.jpg",
      "restrictions": null
    },
    "286": {
      "materialId": "286",
      "title": "FDM - ASA - Black - 100%",
      "supportsColorFiles": false,
      "printerId": "82",
      "swatch": "https://www.shapeways.com/rrstatic/img/materials/plastic_wsf_black.jpg",
      "restrictions": null
    },
    "287": {
      "materialId": "287",
      "title": "FDM - ASA - White - 15%",
      "supportsColorFiles": false,
      "printerId": "82",
      "swatch": "https://www.shapeways.com/rrstatic/img/materials/plastic_wsf_white.jpg",
      "restrictions": null
    },
    "288": {
      "materialId": "288",
      "title": "FDM - ASA - White - 35%",
      "supportsColorFiles": false,
      "printerId": "82",
      "swatch": "https://www.shapeways.com/rrstatic/img/materials/plastic_wsf_white.jpg",
      "restrictions": null
    },
    "289": {
      "materialId": "289",
      "title": "FDM - ASA - White - 70%",
      "supportsColorFiles": false,
      "printerId": "82",
      "swatch": "https://www.shapeways.com/rrstatic/img/materials/plastic_wsf_white.jpg",
      "restrictions": null
    },
    "290": {
      "materialId": "290",
      "title": "FDM - ASA - White - 100%",
      "supportsColorFiles": false,
      "printerId": "82",
      "swatch": "https://www.shapeways.com/rrstatic/img/materials/plastic_wsf_white.jpg",
      "restrictions": null
    },
    "291": {
      "materialId": "291",
      "title": "FDM - PETG - Black - 15%",
      "supportsColorFiles": false,
      "printerId": "82",
      "swatch": "https://www.shapeways.com/rrstatic/img/materials/plastic_wsf_black.jpg",
      "restrictions": null
    },
    "292": {
      "materialId": "292",
      "title": "FDM - PETG - Black - 35%",
      "supportsColorFiles": false,
      "printerId": "82",
      "swatch": "https://www.shapeways.com/rrstatic/img/materials/plastic_wsf_black.jpg",
      "restrictions": null
    },
    "293": {
      "materialId": "293",
      "title": "FDM - PETG - Black - 70%",
      "supportsColorFiles": false,
      "printerId": "82",
      "swatch": "https://www.shapeways.com/rrstatic/img/materials/plastic_wsf_black.jpg",
      "restrictions": null
    },
    "294": {
      "materialId": "294",
      "title": "FDM - PETG - Black - 100%",
      "supportsColorFiles": false,
      "printerId": "82",
      "swatch": "https://www.shapeways.com/rrstatic/img/materials/plastic_wsf_black.jpg",
      "restrictions": null
    },
    "295": {
      "materialId": "295",
      "title": "FDM - PETG - White - 15%",
      "supportsColorFiles": false,
      "printerId": "82",
      "swatch": "https://www.shapeways.com/rrstatic/img/materials/plastic_wsf_white.jpg",
      "restrictions": null
    },
    "296": {
      "materialId": "296",
      "title": "FDM - PETG - White - 35%",
      "supportsColorFiles": false,
      "printerId": "82",
      "swatch": "https://www.shapeways.com/rrstatic/img/materials/plastic_wsf_white.jpg",
      "restrictions": null
    },
    "297": {
      "materialId": "297",
      "title": "FDM - PETG - White - 70%",
      "supportsColorFiles": false,
      "printerId": "82",
      "swatch": "https://www.shapeways.com/rrstatic/img/materials/plastic_wsf_white.jpg",
      "restrictions": null
    },
    "298": {
      "materialId": "298",
      "title": "FDM - PETG - White - 100%",
      "supportsColorFiles": false,
      "printerId": "82",
      "swatch": "https://www.shapeways.com/rrstatic/img/materials/plastic_wsf_white.jpg",
      "restrictions": null
    },
    "307": {
      "materialId": "307",
      "title": "FDM - PC - Black - 15%",
      "supportsColorFiles": false,
      "printerId": "77",
      "swatch": "https://www.shapeways.com/rrstatic/img/materials/plastic_wsf_black.jpg",
      "restrictions": null
    },
    "308": {
      "materialId": "308",
      "title": "FDM - PC - Black - 35%",
      "supportsColorFiles": false,
      "printerId": "77",
      "swatch": "https://www.shapeways.com/rrstatic/img/materials/plastic_wsf_black.jpg",
      "restrictions": null
    },
    "309": {
      "materialId": "309",
      "title": "FDM - PC - Black - 70%",
      "supportsColorFiles": false,
      "printerId": "77",
      "swatch": "https://www.shapeways.com/rrstatic/img/materials/plastic_wsf_black.jpg",
      "restrictions": null
    },
    "310": {
      "materialId": "310",
      "title": "FDM - PC - Black - 100%",
      "supportsColorFiles": false,
      "printerId": "77",
      "swatch": "https://www.shapeways.com/rrstatic/img/materials/plastic_wsf_black.jpg",
      "restrictions": null
    },
    "311": {
      "materialId": "311",
      "title": "FDM - PC - White - 15%",
      "supportsColorFiles": false,
      "printerId": "77",
      "swatch": "https://www.shapeways.com/rrstatic/img/materials/plastic_wsf_white.jpg",
      "restrictions": null
    },
    "312": {
      "materialId": "312",
      "title": "FDM - PC - White - 35%",
      "supportsColorFiles": false,
      "printerId": "77",
      "swatch": "https://www.shapeways.com/rrstatic/img/materials/plastic_wsf_white.jpg",
      "restrictions": null
    },
    "313": {
      "materialId": "313",
      "title": "FDM - PC - White - 70%",
      "supportsColorFiles": false,
      "printerId": "77",
      "swatch": "https://www.shapeways.com/rrstatic/img/materials/plastic_wsf_white.jpg",
      "restrictions": null
    },
    "314": {
      "materialId": "314",
      "title": "FDM - PC - White - 100%",
      "supportsColorFiles": false,
      "printerId": "77",
      "swatch": "https://www.shapeways.com/rrstatic/img/materials/plastic_wsf_white.jpg",
      "restrictions": null
    },
    "318": {
      "materialId": "318",
      "title": "MJF - Nylon PA12GB - Black Vapor Smoothing",
      "supportsColorFiles": false,
      "printerId": "8",
      "swatch": "https://www.shapeways.com/rrstatic/img/materials/plastic_wsf_black.jpg",
      "restrictions": {
        "2": {
          "restrictionId": "2",
          "restrictionName": "Owner",
          "restrictionEntityIds": []
        }
      }
    },
    "320": {
      "materialId": "320",
      "title": "MJF - Nylon PA12GB - Black",
      "supportsColorFiles": false,
      "printerId": "37",
      "swatch": "https://www.shapeways.com/rrstatic/img/materials/plastic_wsf_black.jpg",
      "restrictions": null
    },
    "326": {
      "materialId": "326",
      "title": "MJF - Nylon PA12GB - Gray Vapor Smoothing",
      "supportsColorFiles": false,
      "printerId": "63",
      "swatch": "https://www.shapeways.com/files/cms/materials/swatches/MJF%20-%20PA12%20GB%20Smooth.jpg",
      "restrictions": null
    },
    "328": {
      "materialId": "328",
      "title": "SLA - Somos® Watershed XC 11122",
      "supportsColorFiles": false,
      "printerId": "80",
      "swatch": "https://www.shapeways.com/wp-content/uploads/2025/05/SLA.png",
      "restrictions": null
    },
    "329": {
      "materialId": "329",
      "title": "SLA - Somos® Watershed Black",
      "supportsColorFiles": false,
      "printerId": "80",
      "swatch": "https://www.shapeways.com/files/cms/materials/swatches/Watershed%20Black%20Swatch_1.png",
      "restrictions": null
    },
    "330": {
      "materialId": "330",
      "title": "SAF - Nylon PA11 - Gray",
      "supportsColorFiles": false,
      "printerId": "81",
      "swatch": "https://www.shapeways.com/rrstatic/img/materials/swatch-bsf-gray.png",
      "restrictions": null
    },
    "331": {
      "materialId": "331",
      "title": "SAF - Nylon PA11 - Black",
      "supportsColorFiles": false,
      "printerId": "81",
      "swatch": "https://www.shapeways.com/rrstatic/img/materials/plastic_wsf_black.jpg",
      "restrictions": null
    },
    "332": {
      "materialId": "332",
      "title": "SAF - Polypropylene  PP - Gray",
      "supportsColorFiles": false,
      "printerId": "81",
      "swatch": "https://www.shapeways.com/rrstatic/img/materials/swatch-bsf-gray.png",
      "restrictions": null
    }
  },
  "nextActionSuggestions": []
}
```