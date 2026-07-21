"""
orders/packing_slip.py

Redesigned PDF packing slip generation for MarketSphere seller orders, built
with ReportLab Platypus for flow-based multi-page support.

Designed specifically for warehouse fulfillment and customer order verification:
• Includes physical check-off boxes ([ ]) for warehouse item picking
• Highlights SKU and item quantities prominently
• Features warehouse verification & signature sign-off blocks
• Omits all financial details (prices, tax, discounts, grand totals)

Usage:
    from orders.packing_slip import generate_packing_slip
    pdf_buffer = generate_packing_slip(seller_order)
"""

from io import BytesIO

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    HRFlowable,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


# =============================================================
# BRAND & STYLE CONSTANTS
# Matches the MarketSphere design language (invoice.py & shipping_label.py)
# =============================================================
ACCENT_COLOR = colors.HexColor("#9D6638")
HEADING_COLOR = colors.HexColor("#4E220F")
MUTED_COLOR = colors.HexColor("#6B6B6B")
BORDER_COLOR = colors.HexColor("#D9D2C4")
LIGHT_BG = colors.HexColor("#F7F1DE")

PAGE_MARGIN = 20 * mm
PRINTABLE_WIDTH = 170 * mm  # A4 width (210mm) - 2 * PAGE_MARGIN (40mm)


def _get_styles():
    """Returns the ParagraphStyle set used throughout the packing slip."""
    styles = getSampleStyleSheet()

    styles.add(ParagraphStyle(
        name="PackingSlipBrand",
        fontName="Helvetica-Bold",
        fontSize=20,
        textColor=HEADING_COLOR,
        spaceAfter=2,
        leading=22,
    ))

    styles.add(ParagraphStyle(
        name="PackingSlipSubtitle",
        fontName="Helvetica",
        fontSize=9,
        textColor=MUTED_COLOR,
        leading=12,
    ))

    styles.add(ParagraphStyle(
        name="DocTitle",
        fontName="Helvetica-Bold",
        fontSize=14,
        textColor=ACCENT_COLOR,
        alignment=TA_RIGHT,
        leading=16,
    ))

    styles.add(ParagraphStyle(
        name="SectionHeading",
        fontName="Helvetica-Bold",
        fontSize=10,
        textColor=HEADING_COLOR,
        spaceBefore=2,
        spaceAfter=4,
        leading=12,
    ))

    styles.add(ParagraphStyle(
        name="BodyMuted",
        fontName="Helvetica",
        fontSize=8.5,
        textColor=MUTED_COLOR,
        leading=12,
    ))

    styles.add(ParagraphStyle(
        name="BodyText9",
        fontName="Helvetica",
        fontSize=9,
        textColor=colors.black,
        leading=13,
    ))

    styles.add(ParagraphStyle(
        name="PartyText",
        fontName="Helvetica",
        fontSize=8.5,
        textColor=colors.black,
        leading=14,
    ))

    styles.add(ParagraphStyle(
        name="BodyTextBold9",
        fontName="Helvetica-Bold",
        fontSize=9,
        textColor=colors.black,
        leading=13,
    ))

    styles.add(ParagraphStyle(
        name="TableHeader",
        fontName="Helvetica-Bold",
        fontSize=9,
        textColor=colors.white,
        leading=11,
    ))

    styles.add(ParagraphStyle(
        name="TableTextCenter",
        fontName="Helvetica",
        fontSize=9,
        textColor=colors.black,
        alignment=TA_CENTER,
        leading=12,
    ))

    styles.add(ParagraphStyle(
        name="TableTextRight",
        fontName="Helvetica",
        fontSize=9,
        textColor=colors.black,
        alignment=TA_RIGHT,
        leading=12,
    ))

    styles.add(ParagraphStyle(
        name="FooterText",
        fontName="Helvetica",
        fontSize=8,
        textColor=MUTED_COLOR,
        alignment=TA_CENTER,
        leading=11,
    ))

    return styles


# =============================================================
# DATA HELPERS
# =============================================================
def _get_seller_info(seller_order):
    """Extracts seller details with defensive fallbacks across model schemas."""
    seller = getattr(seller_order, "seller", None)
    user = getattr(seller, "user", None) if seller else None

    store_name = (
        getattr(seller, "store_name", None)
        or getattr(seller, "shop_name", None)
        or getattr(seller, "company_name", None)
        or "MarketSphere Seller"
    )
    store_email = (
        getattr(seller, "store_email", None)
        or getattr(seller, "email", None)
        or getattr(user, "email", None)
        or "support@marketsphere.com"
    )
    contact = (
        getattr(user, "contact", None)
        or getattr(seller, "phone_number", None)
        or getattr(seller, "phone", None)
        or "—"
    )

    return {
        "name": store_name,
        "email": store_email,
        "contact": contact,
    }


def _get_customer_info(seller_order):
    """Extract customer shipping information from the parent Order."""

    order = seller_order.order

    return {
        "name": order.shipping_name or "—",
        "phone": order.shipping_phone or "—",
        "address": order.shipping_address or "—",
        "city": order.shipping_city or "—",
        "postal_code": order.shipping_postal_code or "—",
    }

def _get_items_list(seller_order):
    """Safely retrieves order items from either `items` or `sellerorderitems`."""
    if hasattr(seller_order, "items"):
        return seller_order.items.all()
    elif hasattr(seller_order, "sellerorderitems"):
        return seller_order.sellerorderitems.all()
    return []


# =============================================================
# SECTION BUILDERS
# =============================================================
def _build_header(styles):
    """Modern header banner with brand on left and packing slip badge on right."""
    brand_block = [
        Paragraph("MARKETSPHERE", styles["PackingSlipBrand"]),
        Paragraph("Fulfillment & Warehouse Packing Slip", styles["PackingSlipSubtitle"]),
    ]

    doc_block = [
        Paragraph("PACKING SLIP", styles["DocTitle"]),
    ]

    header_table = Table([[brand_block, doc_block]], colWidths=[100 * mm, 70 * mm])
    header_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "BOTTOM"),
        ("ALIGN", (1, 0), (1, 0), "RIGHT"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ("TOPPADDING", (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
    ]))

    return [
        header_table,
        Spacer(1, 8),
        HRFlowable(width="100%", thickness=1.2, color=ACCENT_COLOR, spaceAfter=14),
    ]


def _build_meta_card(seller_order, styles):
    """Key/Value grid card for Order Number, Packing Date, Tracking Number, Courier, Status."""
    parent_order = getattr(seller_order, "order", seller_order)
    created_at = getattr(seller_order, "created_at", None) or getattr(parent_order, "created_at", None)
    date_str = created_at.strftime("%B %d, %Y") if created_at else "—"

    order_num = getattr(parent_order, "order_number", "—")
    tracking_num = getattr(seller_order, "tracking_number", None) or "—"
    courier_name = getattr(seller_order, "courier", None) or "Standard Delivery"

    status = (
        seller_order.get_status_display()
        if hasattr(seller_order, "get_status_display")
        else getattr(seller_order, "status", "Pending").title()
    )

    rows = [
        ("Order Number", order_num, "Packing Date", date_str),
        ("Tracking Number", tracking_num, "Courier", courier_name),
        ("Order Status", status, "Package Count", "1 of 1"),
    ]

    table_data = []
    for r in rows:
        table_data.append([
            Paragraph(r[0], styles["BodyTextBold9"]),
            Paragraph(r[1], styles["BodyText9"]),
            Paragraph(r[2], styles["BodyTextBold9"]),
            Paragraph(r[3], styles["BodyText9"]),
        ])

    table = Table(table_data, colWidths=[32 * mm, 53 * mm, 32 * mm, 53 * mm])
    table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("BACKGROUND", (0, 0), (-1, -1), LIGHT_BG),
        ("BOX", (0, 0), (-1, -1), 0.75, BORDER_COLOR),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
    ]))
    return table


def _build_parties_section(seller_order, styles):
    """Seller (FROM) and Customer (SHIP TO) details formatted side-by-side."""
    seller = _get_seller_info(seller_order)
    customer = _get_customer_info(seller_order)

    seller_lines = [
        f"<b>{seller['name']}</b>",
        f"Contact: {seller['contact']}",
        f"Email: {seller['email']}",
    ]

    city_zip = f"{customer['city']} {customer['postal_code']}".strip()
    buyer_lines = [
        f"<b>{customer['name']}</b>",
        f"Phone: {customer['phone']}",
        customer["address"],
        city_zip if city_zip else "—",
    ]

    from_card = [
        Paragraph("FROM", styles["SectionHeading"]),
        Paragraph("<br/>".join(seller_lines), styles["PartyText"]),
    ]

    to_card = [
        Paragraph("SHIP TO", styles["SectionHeading"]),
        Paragraph("<br/>".join(buyer_lines), styles["PartyText"]),
    ]

    table = Table(
        [[from_card, to_card]],
        colWidths=[83 * mm, 83 * mm],
    )
    table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LINEBELOW", (0, 0), (0, 0), 0.75, BORDER_COLOR),
        ("LINEBELOW", (1, 0), (1, 0), 0.75, BORDER_COLOR),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
    ]))

    wrapper = Table([[table]], colWidths=[PRINTABLE_WIDTH])
    wrapper.setStyle(TableStyle([
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ("TOPPADDING", (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
    ]))
    return table


def _build_items_table(seller_order, styles):
    """Warehouse items table featuring check boxes, index, product name, SKU, and quantity."""
    header = [
        Paragraph("<b>Check</b>", styles["TableHeader"]),
        Paragraph("<b>#</b>", styles["TableHeader"]),
        Paragraph("<b>Product Description</b>", styles["TableHeader"]),
        Paragraph("<b>SKU</b>", styles["TableHeader"]),
        Paragraph("<b>Qty Packed</b>", ParagraphStyle("HeaderRight", parent=styles["TableHeader"], alignment=TA_RIGHT)),
    ]
    table_data = [header]

    items = _get_items_list(seller_order)

    for idx, item in enumerate(items, start=1):
        product = getattr(item, "product", None)
        product_name = getattr(product, "name", str(product or item))
        sku = getattr(product, "sku", None) or "—"
        quantity = str(getattr(item, "quantity", 1))

        table_data.append([
            Paragraph("[ &nbsp; ]", styles["TableTextCenter"]),
            Paragraph(str(idx), styles["TableTextCenter"]),
            Paragraph(product_name, styles["BodyText9"]),
            Paragraph(sku, styles["BodyText9"]),
            Paragraph(quantity, styles["TableTextRight"]),
        ])

    table = Table(
        table_data,
        colWidths=[16 * mm, 12 * mm, 87 * mm, 35 * mm, 20 * mm],
        repeatRows=1,
    )

    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), HEADING_COLOR),
        ("ALIGN", (0, 0), (1, -1), "CENTER"),
        ("ALIGN", (2, 0), (3, -1), "LEFT"),
        ("ALIGN", (4, 0), (4, -1), "RIGHT"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LINEBELOW", (0, 0), (-1, 0), 0.75, HEADING_COLOR),
        ("LINEBELOW", (0, 1), (-1, -2), 0.5, BORDER_COLOR),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, LIGHT_BG]),
    ]))
    return table


def _build_summary_and_verification_section(seller_order, styles):
    """Total quantity badge and warehouse audit signature fields."""
    items = _get_items_list(seller_order)

    total_items = len(items)
    total_quantity = sum(int(getattr(item, "quantity", 1)) for item in items)

    summary_rows = [
        ("Total Line Items:", str(total_items)),
        ("Total Units Packed:", str(total_quantity)),
    ]

    summary_table_data = [
        [Paragraph(f"<b>{label}</b>", styles["BodyText9"]), Paragraph(value, styles["BodyTextBold9"])]
        for label, value in summary_rows
    ]

    summary_table = Table(summary_table_data, colWidths=[45 * mm, 25 * mm], hAlign="RIGHT")
    summary_table.setStyle(TableStyle([
        ("ALIGN", (1, 0), (1, -1), "RIGHT"),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ("LINEABOVE", (0, 0), (-1, 0), 0.5, BORDER_COLOR),
        ("LINEBELOW", (0, -1), (-1, -1), 1, ACCENT_COLOR),
    ]))

    verify_data = [
        [
            Paragraph("<b>Packed By (Staff Name):</b> _______________________", styles["BodyText9"]),
            Paragraph("<b>Date:</b> _____________", styles["BodyText9"]),
        ],
        [
            Paragraph("<b>Inspected By (QA):</b> ___________________________", styles["BodyText9"]),
            Paragraph("<b>Date:</b> _____________", styles["BodyText9"]),
        ],
        [
            Paragraph("<b>Customer Signature:</b> ________________________", styles["BodyText9"]),
            Paragraph("<b>Date:</b> _____________", styles["BodyText9"]),
        ],
    ]

    verify_table = Table(verify_data, colWidths=[115 * mm, 55 * mm])
    verify_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("BACKGROUND", (0, 0), (-1, -1), LIGHT_BG),
        ("BOX", (0, 0), (-1, -1), 0.75, BORDER_COLOR),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, BORDER_COLOR),
    ]))

    return [
        summary_table,
        Spacer(1, 14),
        Paragraph("FULFILLMENT VERIFICATION & AUDIT SIGN-OFF", styles["SectionHeading"]),
        Spacer(1, 4),
        verify_table,
    ]


def _build_footer(styles):
    """Footer note for recipient inspection guidance."""
    return [
        Spacer(1, 20),
        HRFlowable(width="100%", thickness=0.75, color=BORDER_COLOR, spaceAfter=10),
        Paragraph("<b>Important:</b> Please verify all received items against this packing slip immediately upon arrival.", styles["FooterText"]),
        Paragraph("For discrepancies or shipping support, contact support@marketsphere.com", styles["FooterText"]),
    ]


# =============================================================
# PUBLIC ENTRY POINT
# =============================================================
def generate_packing_slip(seller_order):
    """Builds a professional A4 PDF packing slip for the given SellerOrder and
    returns it as an in-memory BytesIO buffer ready to be written to a Django FileResponse.
    """
    buffer = BytesIO()
    styles = _get_styles()

    parent_order = getattr(seller_order, "order", seller_order)
    order_num = getattr(parent_order, "order_number", "0000")

    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        topMargin=PAGE_MARGIN,
        bottomMargin=PAGE_MARGIN,
        leftMargin=PAGE_MARGIN,
        rightMargin=PAGE_MARGIN,
        title=f"Packing Slip - {order_num}",
    )

    elements = []
    elements += _build_header(styles)
    elements.append(_build_meta_card(seller_order, styles))
    elements.append(Spacer(1, 14))
    elements.append(_build_parties_section(seller_order, styles))
    elements.append(Spacer(1, 14))
    elements.append(Paragraph("PACKED ITEMS CHECKLIST", styles["SectionHeading"]))
    elements.append(Spacer(1, 2))
    elements.append(_build_items_table(seller_order, styles))
    elements.append(Spacer(1, 10))
    elements += _build_summary_and_verification_section(seller_order, styles)
    elements += _build_footer(styles)

    doc.build(elements)

    buffer.seek(0)
    return buffer