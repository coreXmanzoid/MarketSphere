import datetime
from io import BytesIO

from django.utils import timezone
from django.http import HttpResponse
from django.db.models import Sum, Count, Q

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable, KeepTogether
)

# Replace with your actual app model imports
from orders.models import SellerOrder, OrderItem
from products.models import Product


# =============================================================
# BRAND & STYLE CONSTANTS
# =============================================================
HEADING_COLOR = colors.HexColor("#4E220F")
ACCENT_COLOR = colors.HexColor("#9D6638")
MUTED_COLOR = colors.HexColor("#6B6B6B")
BORDER_COLOR = colors.HexColor("#D9D2C4")
LIGHT_BG = colors.HexColor("#F7F1DE")

PAGE_MARGIN = 20 * mm


def _get_styles():
    """Defines the typography system for the revenue report."""
    styles = getSampleStyleSheet()

    styles.add(ParagraphStyle(
        name="ReportBrand", fontName="Helvetica-Bold", fontSize=24, textColor=HEADING_COLOR, spaceAfter=4,
    ))
    styles.add(ParagraphStyle(
        name="ReportTitle", fontName="Helvetica", fontSize=14, textColor=MUTED_COLOR, spaceAfter=8, spaceBefore=10,
    ))
    styles.add(ParagraphStyle(
        name="SectionHeading", fontName="Helvetica-Bold", fontSize=14, textColor=HEADING_COLOR, spaceBefore=15, spaceAfter=8,
    ))
    styles.add(ParagraphStyle(
        name="KeyStyle", fontName="Helvetica-Bold", fontSize=9.5, textColor=HEADING_COLOR,
    ))
    styles.add(ParagraphStyle(
        name="ValueStyle", fontName="Helvetica", fontSize=9.5, textColor=colors.black,
    ))
    styles.add(ParagraphStyle(
        name="TableHeader", fontName="Helvetica-Bold", fontSize=9, textColor=colors.white,
    ))
    styles.add(ParagraphStyle(
        name="TableCell", fontName="Helvetica", fontSize=9, textColor=colors.black, leading=12,
    ))
    styles.add(ParagraphStyle(
        name="TableCellRight", fontName="Helvetica", fontSize=9, textColor=colors.black, alignment=TA_RIGHT, leading=12,
    ))

    return styles


def _currency(value):
    """Safely formats decimal/float into currency string."""
    try:
        return f"Rs. {float(value or 0):,.2f}"
    except (TypeError, ValueError):
        return "Rs. 0.00"


def _draw_footer(canvas, doc):
    """Canvas hook for drawing the universal footer on every page."""
    canvas.saveState()
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(MUTED_COLOR)
    
    timestamp = timezone.localtime().strftime("%Y-%m-%d %H:%M:%S")
    
    canvas.drawString(PAGE_MARGIN, 10 * mm, "Generated automatically by MarketSphere Admin Dashboard")
    canvas.drawCentredString(A4[0] / 2.0, 10 * mm, timestamp)
    canvas.drawRightString(A4[0] - PAGE_MARGIN, 10 * mm, f"Page {doc.page}")
    
    canvas.restoreState()


# =============================================================
# DATA AGGREGATION & CALCULATIONS
# =============================================================
def _calculate_metrics(seller):
    """Performs optimized DB queries to calculate all required report metrics."""
    now = timezone.now()
    
    # Calculate month boundaries
    first_day_this_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    last_day_prev_month = first_day_this_month - datetime.timedelta(days=1)
    first_day_prev_month = last_day_prev_month.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    # 1. Order & Revenue Stats (Excluding cancelled for valid revenue)
    orders = SellerOrder.objects.filter(seller=seller)
    total_orders = orders.count()
    
    order_stats = orders.aggregate(
        completed=Count('id', filter=Q(status__iexact='completed') | Q(status__iexact='delivered')),
        cancelled=Count('id', filter=Q(status__iexact='cancelled')),
        pending=Count('id', filter=Q(status__iexact='pending')),
        processing=Count('id', filter=Q(status__iexact='processing')),
        shipped=Count('id', filter=Q(status__iexact='shipped')),
        
        lifetime_rev=Sum('total', filter=~Q(status__iexact='cancelled')),
        monthly_rev=Sum('total', filter=~Q(status__iexact='cancelled') & Q(created_at__gte=first_day_this_month)),
        prev_monthly_rev=Sum('total', filter=~Q(status__iexact='cancelled') & Q(created_at__gte=first_day_prev_month) & Q(created_at__lt=first_day_this_month))
    )

    lifetime_rev = order_stats['lifetime_rev'] or 0
    monthly_rev = order_stats['monthly_rev'] or 0
    prev_monthly_rev = order_stats['prev_monthly_rev'] or 0

    # Growth % Calculation
    if prev_monthly_rev > 0:
        growth = ((float(monthly_rev) - float(prev_monthly_rev)) / float(prev_monthly_rev)) * 100
    else:
        growth = 100.0 if monthly_rev > 0 else 0.0

    # Rates
    aov = float(lifetime_rev) / total_orders if total_orders > 0 else 0.0
    refund_rate = (float(order_stats['cancelled']) / float(total_orders)) * 100 if total_orders > 0 else 0.0

    # 2. Product Stats
    products = Product.objects.filter(seller=seller)
    product_stats = products.aggregate(
        total=Count('id'),
        published=Count('id', filter=Q(status__iexact='published')),
        hidden=Count('id', filter=Q(status__iexact='hidden')),
        draft=Count('id', filter=Q(status__iexact='draft')),
        out_of_stock=Count('id', filter=Q(stock_quantity__lte=0))
    )

    # 3. Top Selling Products (Top 10)
    top_products = (
        OrderItem.objects.filter(
            seller_order__seller=seller,
            seller_order__status=SellerOrder.Status.DELIVERED,
        )
        .values("product__name")
        .annotate(
            units_sold=Sum("quantity"),
            revenue=Sum("total"),
        )
        .order_by("-units_sold")[:10]
    )
    # 4. Top Categories (Top 10) - Assumes 'category' is a string/CharField or related model name
    top_categories = (
        OrderItem.objects.filter(
            seller_order__seller=seller,
            seller_order__status=SellerOrder.Status.DELIVERED,
        )
        .values("product__category__name")
        .annotate(
            units_sold=Sum("quantity"),
            revenue=Sum("total"),
        )
        .order_by("-units_sold")[:10]
    )
    # 5. Largest Orders (Top 10)
    largest_orders = SellerOrder.objects.filter(seller=seller) \
        .select_related('order') \
        .order_by('-total')[:10]

    return {
        "order_stats": order_stats,
        "total_orders": total_orders,
        "revenue": {
            "lifetime": lifetime_rev,
            "monthly": monthly_rev,
            "previous": prev_monthly_rev,
            "growth": growth,
            "aov": aov,
            "refund_rate": refund_rate,
        },
        "product_stats": product_stats,
        "top_products": top_products,
        "top_categories": top_categories,
        "largest_orders": largest_orders,
    }


# =============================================================
# PDF BUILDERS
# =============================================================
def _build_kv_grid(data_list, styles):
    """Renders a structured 4-column (2-pair) Key-Value grid."""
    rows = []
    for i in range(0, len(data_list), 2):
        row = []
        item1 = data_list[i]
        row.extend([Paragraph(item1[0], styles["KeyStyle"]), Paragraph(str(item1[1]), styles["ValueStyle"])])
        
        if i + 1 < len(data_list):
            item2 = data_list[i+1]
            row.extend([Paragraph(item2[0], styles["KeyStyle"]), Paragraph(str(item2[1]), styles["ValueStyle"])])
        else:
            row.extend([Paragraph("", styles["KeyStyle"]), Paragraph("", styles["ValueStyle"])])
            
        rows.append(row)
        
    table = Table(rows, colWidths=[40*mm, 45*mm, 40*mm, 45*mm])
    table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LINEBELOW', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
    ]))
    return table


def _build_data_table(headers, row_data, col_widths, styles, align_right_cols=None):
    """Builds a formatted list table. align_right_cols expects a list of column indices."""
    if not align_right_cols:
        align_right_cols = []
        
    table_data = []
    
    # Headers
    header_row = []
    for idx, header in enumerate(headers):
        style = ParagraphStyle("Temp", parent=styles["TableHeader"], alignment=TA_RIGHT if idx in align_right_cols else TA_CENTER)
        header_row.append(Paragraph(header, style))
    table_data.append(header_row)
    
    # Rows
    if not row_data:
        empty_row = [Paragraph("<i>No data available</i>", styles["TableCell"])] + [""] * (len(headers) - 1)
        table_data.append(empty_row)
    else:
        for row in row_data:
            formatted_row = []
            for idx, cell_value in enumerate(row):
                style = styles["TableCellRight"] if idx in align_right_cols else styles["TableCell"]
                formatted_row.append(Paragraph(str(cell_value), style))
            table_data.append(formatted_row)
            
    t = Table(table_data, colWidths=col_widths, repeatRows=1)
    
    # Base table style
    t_style = [
        ('BACKGROUND', (0, 0), (-1, 0), HEADING_COLOR),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LINEBELOW', (0, 1), (-1, -2), 0.5, BORDER_COLOR),
    ]
    
    # Apply row backgrounds if we have data
    if row_data:
        t_style.append(('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, LIGHT_BG]))
        
    t.setStyle(TableStyle(t_style))
    return t


# =============================================================
# PUBLIC EXPORT FUNCTION
# =============================================================
def export_revenue_report(seller):
    """
    Main orchestration function. Builds the ReportLab document flow, compiles metrics,
    and directly returns the HttpResponse for download.
    """
    metrics = _calculate_metrics(seller)
    styles = _get_styles()
    buffer = BytesIO()
    
    doc = SimpleDocTemplate(
        buffer, pagesize=A4,
        leftMargin=PAGE_MARGIN, rightMargin=PAGE_MARGIN,
        topMargin=PAGE_MARGIN, bottomMargin=PAGE_MARGIN,
        title=f"Revenue Report - {seller.store_name}"
    )
    
    elements = []
    
    # --- PAGE 1: HEADER ---
    elements.extend([
        Paragraph("MARKETSPHERE", styles["ReportBrand"]),
        Paragraph("Seller Revenue Report", styles["ReportTitle"]),
        HRFlowable(width="100%", thickness=1.5, color=ACCENT_COLOR, spaceAfter=15),
    ])
    
    seller_info = [
        ("Seller Name", seller.store_name),
        ("Report Generated On", timezone.localtime().strftime("%b %d, %Y")),
        ("Store Email", seller.store_email),
        ("Verification Status", getattr(seller, 'status', 'Unknown').title()),
        ("Seller ID", getattr(seller, 'slug', str(seller.id))),
        ("Store Created Date", seller.created_at.strftime("%b %d, %Y") if seller.created_at else "—"),
    ]
    elements.append(_build_kv_grid(seller_info, styles))
    elements.append(Spacer(1, 10))
    
    # --- REVENUE SUMMARY ---
    elements.append(Paragraph("Revenue Summary", styles["SectionHeading"]))
    rev = metrics["revenue"]
    rev_info = [
        ("Lifetime Revenue", _currency(rev["lifetime"])),
        ("Total Orders", metrics["total_orders"]),
        ("Monthly Revenue", _currency(rev["monthly"])),
        ("Completed Orders", metrics["order_stats"]["completed"]),
        ("Previous Month Revenue", _currency(rev["previous"])),
        ("Cancelled Orders", metrics["order_stats"]["cancelled"]),
        ("Revenue Growth %", f"{rev['growth']:+.2f}%"),
        ("Refund Rate", f"{rev['refund_rate']:.2f}%"),
        ("Average Order Value", _currency(rev["aov"])),
        ("", ""),
    ]
    elements.append(_build_kv_grid(rev_info, styles))
    elements.append(Spacer(1, 10))
    
    # --- ORDER STATISTICS ---
    elements.append(Paragraph("Order Statistics", styles["SectionHeading"]))
    ord_stats = metrics["order_stats"]
    order_grid = [
        ("Pending Orders", ord_stats["pending"]),
        ("Shipped Orders", ord_stats["shipped"]),
        ("Processing Orders", ord_stats["processing"]),
        ("Delivered Orders", ord_stats["completed"]),  # completed implies delivered based on calc
        ("Cancelled Orders", ord_stats["cancelled"]),
        ("", ""),
    ]
    elements.append(_build_kv_grid(order_grid, styles))
    elements.append(Spacer(1, 10))
    
    # --- PRODUCT STATISTICS ---
    elements.append(Paragraph("Product Statistics", styles["SectionHeading"]))
    prod = metrics["product_stats"]
    prod_grid = [
        ("Total Products", prod["total"]),
        ("Draft Products", prod["draft"]),
        ("Published Products", prod["published"]),
        ("Out of Stock Products", prod["out_of_stock"]),
        ("Hidden Products", prod["hidden"]),
        ("", ""),
    ]
    elements.append(_build_kv_grid(prod_grid, styles))
    elements.append(Spacer(1, 15))
    
    # --- TOP SELLING PRODUCTS ---
    elements.append(KeepTogether([
        Paragraph("Top Selling Products", styles["SectionHeading"]),
        _build_data_table(
            headers=["Product", "Units Sold", "Revenue"],
            row_data=[
                (p["product__name"] or "Unknown", p["units_sold"], _currency(p["revenue"]))
                for p in metrics["top_products"]
            ],
            col_widths=[100*mm, 30*mm, 40*mm],
            styles=styles,
            align_right_cols=[1, 2]
        )
    ]))
    elements.append(Spacer(1, 15))
        # --- TOP CATEGORIES ---
    elements.append(KeepTogether([
        Paragraph("Top Categories", styles["SectionHeading"]),
        _build_data_table(
            headers=["Category", "Products Sold", "Revenue"],
            row_data=[
                (
                    c["product__category__name"] or "Uncategorized",
                    c["units_sold"],
                    _currency(c["revenue"]),
                )
                for c in metrics["top_categories"]
            ],
            col_widths=[90*mm, 40*mm, 40*mm],
            styles=styles,
            align_right_cols=[1, 2],
        )
    ]))
    elements.append(Spacer(1, 15))
    
    # --- LARGEST ORDERS ---
    largest_order_rows = []
    for so in metrics["largest_orders"]:
        parent_order = getattr(so, 'order', None)
        cust_name = parent_order.shipping_name if parent_order else "Unknown Customer"
        order_num = parent_order.order_number if parent_order else "N/A"
        date_str = so.created_at.strftime("%b %d, %Y") if so.created_at else "—"
        largest_order_rows.append((
            order_num,
            cust_name,
            date_str,
            so.get_status_display() if hasattr(so, 'get_status_display') else str(so.status).title(),
            _currency(so.total)
        ))

    elements.append(KeepTogether([
        Paragraph("Largest Orders", styles["SectionHeading"]),
        _build_data_table(
            headers=["Order Number", "Customer", "Date", "Status", "Amount"],
            row_data=largest_order_rows,
            col_widths=[30*mm, 50*mm, 30*mm, 30*mm, 30*mm],
            styles=styles,
            align_right_cols=[4]
        )
    ]))

    # Render Document
    doc.build(elements, onFirstPage=_draw_footer, onLaterPages=_draw_footer)
    
    # Construct filename and HTTP response
    date_str = timezone.now().strftime("%Y-%m-%d")
    safe_slug = str(getattr(seller, 'slug', seller.id)).lower().replace(" ", "-")
    filename = f"seller-revenue-report-{safe_slug}-{date_str}.pdf"

    response = HttpResponse(buffer.getvalue(), content_type='application/pdf')
    response['Content-Disposition'] = f'attachment; filename="{filename}"'
    
    return response