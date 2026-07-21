"""
orders/shipping_label.py

PDF shipping label generation for MarketSphere seller orders, built with ReportLab
Platypus. Designed for standard 4x6 inch thermal/shipping label printing, matching
the visual identity and brand aesthetics of invoice.py and packing_slip.py.

Includes prominent Cash on Delivery (COD) collection badges for courier handlers.

Usage:
    from orders.shipping_label import generate_shipping_label
    pdf_buffer = generate_shipping_label(seller_order)
"""

from io import BytesIO

from reportlab.graphics.shapes import Drawing, Rect, String
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import inch, mm
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.platypus import (
    HRFlowable,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


# =============================================================
# BRAND / STYLE CONSTANTS
# Matches invoice.py and packing_slip.py palette and typography
# =============================================================
ACCENT_COLOR = colors.HexColor("#9D6638")
HEADING_COLOR = colors.HexColor("#4E220F")
MUTED_COLOR = colors.HexColor("#6B6B6B")
BORDER_COLOR = colors.HexColor("#D9D2C4")
LIGHT_BG = colors.HexColor("#F7F1DE")

LABEL_WIDTH = 4 * inch
LABEL_HEIGHT = 6 * inch
PAGE_MARGIN = 5 * mm
PRINTABLE_WIDTH = LABEL_WIDTH - (2 * PAGE_MARGIN)  # ~89.6 mm


def _get_styles():
    """Returns the ParagraphStyle set used throughout the shipping label."""
    styles = getSampleStyleSheet()

    styles.add(ParagraphStyle(
        name="LabelBrand",
        fontName="Helvetica-Bold",
        fontSize=13,
        textColor=HEADING_COLOR,
        spaceAfter=0,
        leading=15,
    ))

    styles.add(ParagraphStyle(
        name="LabelTitle",
        fontName="Helvetica-Bold",
        fontSize=8.5,
        textColor=ACCENT_COLOR,
        alignment=TA_RIGHT,
        leading=10,
    ))

    styles.add(ParagraphStyle(
        name="SectionHeading",
        fontName="Helvetica-Bold",
        fontSize=8,
        textColor=HEADING_COLOR,
        spaceBefore=1,
        spaceAfter=2,
        leading=9,
    ))

    styles.add(ParagraphStyle(
        name="TrackingNumber",
        fontName="Helvetica-Bold",
        fontSize=12,
        textColor=HEADING_COLOR,
        alignment=TA_CENTER,
        leading=14,
    ))

    styles.add(ParagraphStyle(
        name="CourierName",
        fontName="Helvetica-Bold",
        fontSize=8.5,
        textColor=MUTED_COLOR,
        alignment=TA_CENTER,
        leading=11,
    ))

    styles.add(ParagraphStyle(
        name="CodBadge",
        fontName="Helvetica-Bold",
        fontSize=10,
        textColor=HEADING_COLOR,
        alignment=TA_CENTER,
        leading=12,
    ))

    styles.add(ParagraphStyle(
        name="PartyText",
        fontName="Helvetica",
        fontSize=7.5,
        textColor=colors.black,
        leading=10,
    ))

    styles.add(ParagraphStyle(
        name="BodyText8",
        fontName="Helvetica",
        fontSize=7.5,
        textColor=colors.black,
        leading=10,
    ))

    styles.add(ParagraphStyle(
        name="BodyTextBold8",
        fontName="Helvetica-Bold",
        fontSize=7.5,
        textColor=colors.black,
        leading=10,
    ))

    styles.add(ParagraphStyle(
        name="FooterText",
        fontName="Helvetica",
        fontSize=6.5,
        textColor=MUTED_COLOR,
        alignment=TA_CENTER,
        leading=8,
    ))

    return styles


# =============================================================
# FORMATTING & DATA HELPERS
# =============================================================
def _currency(value):
    """Formats a Decimal/number as 'Rs. 1,234.00'."""
    try:
        return "Rs. {:,.2f}".format(float(value or 0))
    except (TypeError, ValueError):
        return "Rs. 0.00"


def _get_seller_info(seller_order):
    """Extract seller information for the shipping label."""

    seller = seller_order.seller
    user = seller.user

    store_name = seller.store_name or "MarketSphere Seller"

    store_email = (
        seller.store_email
        or user.email
        or "—"
    )

    phone = (
        user.contact
        or "—"
    )

    business_address = seller.business_address

    if business_address:
        address_parts = [
            business_address.address_line_1,
        ]

        if business_address.address_line_2:
            address_parts.append(business_address.address_line_2)

        address_parts.append(
            f"{business_address.city}, {business_address.postal_code}"
        )

        address = "<br/>".join(address_parts)
    else:
        address = "—"

    return {
        "name": store_name,
        "email": store_email,
        "phone": phone,
        "address": address,
    }

def _get_customer_info(seller_order):
    """Extracts shipping customer details from parent Order."""
    order = getattr(seller_order, "order", seller_order)
    return {
        "name": getattr(order, "shipping_name", None) or "—",
        "phone": getattr(order, "shipping_phone", None) or "—",
        "address": getattr(order, "shipping_address", None) or "—",
        "city": getattr(order, "shipping_city", None) or "—",
        "postal_code": getattr(order, "shipping_postal_code", None) or "",
    }


def _get_cod_payment_info(seller_order):
    """Determines COD collectable status/amount or PREPAID indicator."""
    parent_order = getattr(seller_order, "order", seller_order)
    payment_status = getattr(parent_order, "payment_status", "unpaid").lower()

    # Determine total collectable amount for this seller order
    seller_total = getattr(seller_order, "total", getattr(parent_order, "total", 0))

    if payment_status in ["unpaid", "pending", "cod"]:
        cod_label = f"COD: {_currency(seller_total)}"
        is_cod = True
    else:
        cod_label = "PREPAID"
        is_cod = False

    return cod_label, is_cod


# =============================================================
# SECTION BUILDERS
# =============================================================
def _build_header(styles):
    """Top banner containing brand identity and label title."""
    brand_p = Paragraph("MARKETSPHERE", styles["LabelBrand"])
    title_p = Paragraph("SHIPPING LABEL", styles["LabelTitle"])

    table = Table([[brand_p, title_p]], colWidths=[45 * mm, 44.6 * mm])
    table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("ALIGN", (1, 0), (1, 0), "RIGHT"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
        ("TOPPADDING", (0, 0), (-1, -1), 0),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
    ]))

    return [
        table,
        Spacer(1, 2),
        HRFlowable(width="100%", thickness=1, color=ACCENT_COLOR, spaceAfter=4),
    ]


def _build_tracking_and_cod_box(seller_order, styles):
    """Prominent card highlighting Courier Name, Tracking Number, and COD Amount."""
    courier_text = (getattr(seller_order, "courier", None) or "Standard Delivery").upper()
    tracking_text = getattr(seller_order, "tracking_number", None) or f"TRK-{getattr(seller_order, 'id', '0000')}"

    cod_text, is_cod = _get_cod_payment_info(seller_order)

    # Highlight COD in distinct background for quick driver identification
    cod_bg = colors.HexColor("#FDE8E8") if is_cod else colors.HexColor("#E1F0DA")
    cod_border = colors.HexColor("#D9534F") if is_cod else colors.HexColor("#4CAF50")

    courier_p = Paragraph(f"COURIER: <b>{courier_text}</b>", styles["CourierName"])

    cod_p = Paragraph(f"<b>{cod_text}</b>", styles["CodBadge"])
    cod_table = Table([[cod_p]], colWidths=[PRINTABLE_WIDTH - 8 * mm])
    cod_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), cod_bg),
        ("BOX", (0, 0), (-1, -1), 0.75, cod_border),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
    ]))

    content = [
        [courier_p],
        [Paragraph(f"<b>{tracking_text}</b>", styles["TrackingNumber"])],
        [Spacer(1, 2)],
        [cod_table],
    ]

    main_table = Table(content, colWidths=[PRINTABLE_WIDTH])
    main_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), LIGHT_BG),
        ("BOX", (0, 0), (-1, -1), 1, BORDER_COLOR),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING", (0, 0), (-1, -1), 4),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
    ]))

    return main_table


def _build_parties_section(seller_order, styles):
    """Side-by-side FROM (Seller) and SHIP TO (Customer) addresses in cards."""
    seller = _get_seller_info(seller_order)
    customer = _get_customer_info(seller_order)

    seller_lines = [
        f"<b>{seller['name']}</b>",
        seller["address"],
        f"Ph: {seller['phone']}",
        seller["email"],
    ]

    city_zip = f"{customer['city']} {customer['postal_code']}".strip()
    customer_lines = [
        f"<b>{customer['name']}</b>",
        customer["address"],
        city_zip,
        f"Ph: {customer['phone']}",
    ]

    from_card = [
        Paragraph("FROM", styles["SectionHeading"]),
        Paragraph("<br/>".join(seller_lines), styles["PartyText"]),
    ]

    to_card = [
        Paragraph("SHIP TO", styles["SectionHeading"]),
        Paragraph("<br/>".join(customer_lines), styles["PartyText"]),
    ]

    table = Table([[from_card, to_card]], colWidths=[43.8 * mm, 43.8 * mm])
    table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("BACKGROUND", (0, 0), (0, 0), colors.white),
        ("BACKGROUND", (1, 0), (1, 0), LIGHT_BG),
        ("BOX", (0, 0), (0, 0), 0.75, BORDER_COLOR),
        ("BOX", (1, 0), (1, 0), 1, ACCENT_COLOR),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING", (0, 0), (-1, -1), 4),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4),
    ]))
    return table


def _build_shipment_info(seller_order, styles):
    """Metadata grid displaying order number, date, status, and package count."""
    parent_order = getattr(seller_order, "order", seller_order)
    created_at = getattr(seller_order, "created_at", None) or getattr(parent_order, "created_at", None)
    date_str = created_at.strftime("%b %d, %Y") if created_at else "—"

    order_num = getattr(parent_order, "order_number", "—")
    status = (
        seller_order.get_status_display()
        if hasattr(seller_order, "get_status_display")
        else getattr(seller_order, "status", "Pending").title()
    )

    rows = [
        ("Order Number", order_num, "Shipment Date", date_str),
        ("Order Status", status, "Package Count", "1 of 1"),
    ]

    table_data = []
    for r in rows:
        table_data.append([
            Paragraph(r[0], styles["BodyTextBold8"]),
            Paragraph(r[1], styles["BodyText8"]),
            Paragraph(r[2], styles["BodyTextBold8"]),
            Paragraph(r[3], styles["BodyText8"]),
        ])

    table = Table(
        table_data,
        colWidths=[21 * mm, 23.8 * mm, 22 * mm, 22.8 * mm],
    )
    table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 2),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
        ("LEFTPADDING", (0, 0), (-1, -1), 2),
        ("RIGHTPADDING", (0, 0), (-1, -1), 2),
        ("LINEBELOW", (0, 0), (-1, -2), 0.5, BORDER_COLOR),
    ]))
    return table


def _build_barcode_placeholder(seller_order):
    """ReportLab vector drawing producing a clean barcode placeholder with tracking text."""
    tracking_text = getattr(seller_order, "tracking_number", None) or f"TRK-{getattr(seller_order, 'id', '0000')}"

    dwg_width = PRINTABLE_WIDTH
    dwg_height = 20 * mm
    d = Drawing(dwg_width, dwg_height)

    # Outer container box
    d.add(Rect(
        0, 0, dwg_width, dwg_height,
        fillColor=LIGHT_BG, strokeColor=BORDER_COLOR, strokeWidth=0.75, rx=3, ry=3
    ))

    # Pseudo-random deterministic bar patterns for vector rendering
    pattern = [2, 1, 3, 1, 1, 2, 4, 1, 2, 1, 3, 1, 2, 2, 1, 3, 1, 1, 2, 3, 1, 2, 1, 4, 1, 2, 1, 3, 1, 2, 1, 3, 1, 2]
    curr_x = 6 * mm
    bar_height = 11 * mm
    start_y = 6.5 * mm

    for width in pattern:
        if curr_x + width > dwg_width - 6 * mm:
            break
        d.add(Rect(
            curr_x, start_y, width, bar_height,
            fillColor=colors.black, strokeColor=colors.black, strokeWidth=0
        ))
        curr_x += width + 1.1 * mm

    # Tracking number label below bars
    d.add(String(
        dwg_width / 2.0, 1.5 * mm, tracking_text,
        textAnchor="middle", fontName="Helvetica-Bold", fontSize=8, fillColor=HEADING_COLOR
    ))

    return d


def _build_footer(styles):
    """Compact footer message."""
    return [
        Spacer(1, 3),
        HRFlowable(width="100%", thickness=0.5, color=BORDER_COLOR, spaceAfter=3),
        Paragraph("MarketSphere Logistics • Handle With Care", styles["FooterText"]),
    ]


# =============================================================
# PUBLIC ENTRY POINT
# =============================================================
def generate_shipping_label(seller_order):
    """Builds a professional 4x6 inch PDF shipping label for the given SellerOrder
    and returns it as an in-memory BytesIO buffer, ready to be served in HTTP responses.
    """
    buffer = BytesIO()
    styles = _get_styles()

    doc = SimpleDocTemplate(
        buffer,
        pagesize=(LABEL_WIDTH, LABEL_HEIGHT),
        topMargin=PAGE_MARGIN,
        bottomMargin=PAGE_MARGIN,
        leftMargin=PAGE_MARGIN,
        rightMargin=PAGE_MARGIN,
        title=f"Shipping Label - {getattr(seller_order, 'tracking_number', 'MarketSphere')}",
    )

    elements = []
    elements += _build_header(styles)
    elements.append(_build_tracking_and_cod_box(seller_order, styles))
    elements.append(Spacer(1, 4))
    elements.append(_build_parties_section(seller_order, styles))
    elements.append(Spacer(1, 4))
    elements.append(_build_shipment_info(seller_order, styles))
    elements.append(Spacer(1, 4))
    elements.append(_build_barcode_placeholder(seller_order))
    elements += _build_footer(styles)

    doc.build(elements)

    buffer.seek(0)
    return buffer