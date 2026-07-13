"""
orders/invoice.py

PDF invoice generation for MarketSphere orders, built with ReportLab
Platypus so the layout flows automatically across pages instead of
relying on hardcoded canvas coordinates.

Usage:
    from orders.invoice import generate_invoice
    pdf_buffer = generate_invoice(order)
"""

from io import BytesIO

from reportlab.lib import colors
from reportlab.lib.enums import TA_RIGHT, TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (
    SimpleDocTemplate,
    Table,
    TableStyle,
    Paragraph,
    Spacer,
    HRFlowable,
)


# =============================================================
# BRAND / STYLE CONSTANTS
# Mirrors the MarketSphere earth-tone palette used across the
# frontend (see static/css/styles.css), kept grayscale-first so
# the invoice prints cleanly.
# =============================================================
ACCENT_COLOR = colors.HexColor("#9D6638")
HEADING_COLOR = colors.HexColor("#4E220F")
MUTED_COLOR = colors.HexColor("#6B6B6B")
BORDER_COLOR = colors.HexColor("#D9D2C4")
LIGHT_BG = colors.HexColor("#F7F1DE")

PAGE_MARGIN = 20 * mm


def _get_styles():
    """Returns the ParagraphStyle set used throughout the invoice."""
    styles = getSampleStyleSheet()

    styles.add(ParagraphStyle(
        name="InvoiceBrand",
        fontName="Helvetica-Bold",
        fontSize=20,
        textColor=HEADING_COLOR,
        spaceAfter=12,
    ))

    styles.add(ParagraphStyle(
        name="InvoiceTitle",
        fontName="Helvetica",
        fontSize=11,
        textColor=ACCENT_COLOR,
        spaceAfter=0,
    ))

    styles.add(ParagraphStyle(
        name="SectionHeading",
        fontName="Helvetica-Bold",
        fontSize=10.5,
        textColor=HEADING_COLOR,
        spaceBefore=4,
        spaceAfter=6,
    ))

    styles.add(ParagraphStyle(
        name="BodyMuted",
        fontName="Helvetica",
        fontSize=9,
        textColor=MUTED_COLOR,
        leading=13,
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
        fontSize=9,
        textColor=colors.black,
        leading=15,
    ))

    styles.add(ParagraphStyle(
        name="BodyTextBold9",
        fontName="Helvetica-Bold",
        fontSize=9,
        textColor=colors.black,
        leading=13,
    ))

    styles.add(ParagraphStyle(
        name="FooterText",
        fontName="Helvetica",
        fontSize=8.5,
        textColor=MUTED_COLOR,
        alignment=TA_CENTER,
        leading=12,
    ))

    return styles


# =============================================================
# SMALL FORMATTING HELPERS
# =============================================================
def _currency(value):
    """Formats a Decimal/number as 'Rs. 1,234.00', matching the
    'Rs.' currency convention used throughout the frontend."""
    try:
        return "Rs. {:,.2f}".format(float(value or 0))
    except (TypeError, ValueError):
        return "Rs. 0.00"


def _invoice_number(order):
    """Generates a temporary invoice number from the order number.

    NOTE: There is no dedicated Invoice model yet. Once one exists,
    replace this with a real persisted invoice number.
    """
    return f"MS-INV-{order.order_number}"


# =============================================================
# SECTION BUILDERS
# Each returns flowables so generate_invoice() just concatenates
# them — keeps the entry point small and each concern separated.
# =============================================================
def _build_header(styles):
    return [
        Paragraph("MARKETSPHERE", styles["InvoiceBrand"]),
        Paragraph("INVOICE", styles["InvoiceTitle"]),
        Spacer(1, 6),
        HRFlowable(width="100%", thickness=1.2, color=ACCENT_COLOR, spaceAfter=14),
    ]


def _build_invoice_info(order, styles):
    """Invoice Number / Order Number / Dates / Statuses as a clean
    two-column key/value table, right-aligned under the header."""
    rows = [
        ("Invoice Number", _invoice_number(order)),
        ("Order Number", order.order_number),
        ("Invoice Date", order.created_at.strftime("%B %d, %Y")),
        ("Order Date", order.created_at.strftime("%B %d, %Y")),
        ("Order Status", order.get_status_display()),
        ("Payment Status", order.get_payment_status_display()),
    ]

    table_data = [
        [Paragraph(label, styles["BodyTextBold9"]), Paragraph(value, styles["BodyText9"])]
        for label, value in rows
    ]

    table = Table(table_data, colWidths=[38 * mm, 52 * mm], hAlign="RIGHT")
    table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING", (0, 0), (-1, -1), 4),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
    ]))
    return table


def _build_parties_section(order, styles):
    """Seller / Buyer information rendered side-by-side."""

    # NOTE: There is no Seller/Shop model wired to Order yet, so this
    # is placeholder business information. Replace with real data once
    # an order-level seller/shop relationship exists.
    seller_lines = [
        "<b>MarketSphere</b>",
        "123 Business Street",
        "Karachi, Pakistan",
        "support@marketsphere.com",
        "+92 XXX XXXXXXX",
    ]

    buyer_lines = [
        f"<b>{order.shipping_name or '—'}</b>",
        order.shipping_phone or "—",
        order.shipping_address or "—",
        f"{order.shipping_city or '—'} {order.shipping_postal_code or ''}".strip(),
    ]

    seller_para = Paragraph("<br/>".join(seller_lines), styles["PartyText"])
    buyer_para = Paragraph("<br/>".join(buyer_lines), styles["PartyText"])

    header_row = [
        Paragraph("SELLER", styles["SectionHeading"]),
        Paragraph("BILL TO", styles["SectionHeading"]),
    ]

    table = Table(
        [header_row, [seller_para, buyer_para]],
        colWidths=[85 * mm, 85 * mm],
    )
    table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LINEBELOW", (0, 0), (0, 0), 0.75, BORDER_COLOR),
        ("LINEBELOW", (1, 0), (1, 0), 0.75, BORDER_COLOR),
        ("TOPPADDING", (0, 1), (-1, 1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    return table


def _build_items_table(order, styles):
    """Products table — one row per OrderItem. As a Platypus Table
    it auto-flows across pages for large orders instead of being
    manually paginated."""
    header = ["Product", "Qty", "Unit Price", "Total"]
    table_data = [header]

    for item in order.items.all():
        table_data.append([
            Paragraph(item.product.name, styles["BodyText9"]),
            str(item.quantity),
            _currency(item.price),
            _currency(item.total),
        ])

    table = Table(
        table_data,
        colWidths=[85 * mm, 20 * mm, 30 * mm, 35 * mm],
        repeatRows=1,
    )

    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), HEADING_COLOR),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, 0), 9),
        ("ALIGN", (1, 0), (-1, -1), "RIGHT"),
        ("ALIGN", (0, 0), (0, -1), "LEFT"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LINEBELOW", (0, 0), (-1, 0), 0.75, HEADING_COLOR),
        ("LINEBELOW", (0, 1), (-1, -2), 0.5, BORDER_COLOR),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, LIGHT_BG]),
        ("FONTSIZE", (0, 1), (-1, -1), 9),
    ]))
    return table


def _build_summary_table(order, styles):
    """Subtotal / Shipping / Discount / Tax / Grand Total, right-
    aligned under the items table, with the grand total emphasized."""
    rows = [
        ("Subtotal", _currency(order.subtotal)),
        ("Shipping", _currency(order.shipping_cost)),
    ]

    if order.discount:
        rows.append(("Discount", f"- {_currency(order.discount)}"))

    rows.append(("Tax", _currency(order.tax)))

    table_data = [
        [Paragraph(label, styles["BodyText9"]), Paragraph(value, styles["BodyText9"])]
        for label, value in rows
    ]

    grand_total_label_style = ParagraphStyle(
        "GrandTotalLabel", parent=styles["BodyTextBold9"],
        fontSize=11, textColor=HEADING_COLOR,
    )
    grand_total_value_style = ParagraphStyle(
        "GrandTotalValue", parent=styles["BodyTextBold9"],
        fontSize=12, textColor=ACCENT_COLOR, alignment=TA_RIGHT,
    )

    table_data.append([
        Paragraph("Grand Total", grand_total_label_style),
        Paragraph(_currency(order.total), grand_total_value_style),
    ])

    table = Table(table_data, colWidths=[35 * mm, 35 * mm], hAlign="RIGHT")
    table.setStyle(TableStyle([
        ("ALIGN", (1, 0), (1, -1), "RIGHT"),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ("LINEABOVE", (0, -1), (-1, -1), 1, ACCENT_COLOR),
        ("TOPPADDING", (0, -1), (-1, -1), 8),
    ]))
    return table


def _build_notes_section(order, styles):
    if not order.notes:
        return []

    return [
        Spacer(1, 10),
        Paragraph("NOTES", styles["SectionHeading"]),
        Paragraph(order.notes, styles["BodyMuted"]),
    ]


def _build_footer(styles):
    return [
        Spacer(1, 24),
        HRFlowable(width="100%", thickness=0.75, color=BORDER_COLOR, spaceAfter=10),
        Paragraph("Thank you for shopping with MarketSphere.", styles["FooterText"]),
        Paragraph("Questions? support@marketsphere.com", styles["FooterText"]),
    ]


# =============================================================
# PUBLIC ENTRY POINT
# =============================================================
def generate_invoice(order):
    """Builds a professional PDF invoice for the given Order and
    returns it as an in-memory BytesIO buffer, ready to be written
    into an HttpResponse/FileResponse.
    """
    buffer = BytesIO()
    styles = _get_styles()

    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        topMargin=PAGE_MARGIN,
        bottomMargin=PAGE_MARGIN,
        leftMargin=PAGE_MARGIN,
        rightMargin=PAGE_MARGIN,
        title=f"Invoice {_invoice_number(order)}",
    )

    elements = []
    elements += _build_header(styles)
    elements.append(_build_invoice_info(order, styles))
    elements.append(Spacer(1, 18))
    elements.append(_build_parties_section(order, styles))
    elements.append(Spacer(1, 18))
    elements.append(Paragraph("ORDER ITEMS", styles["SectionHeading"]))
    elements.append(_build_items_table(order, styles))
    elements.append(Spacer(1, 12))
    elements.append(_build_summary_table(order, styles))
    elements += _build_notes_section(order, styles)
    elements += _build_footer(styles)

    doc.build(elements)

    buffer.seek(0)
    return buffer