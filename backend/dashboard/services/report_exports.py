from datetime import datetime
from io import BytesIO
from pathlib import Path
import zipfile
from xml.sax.saxutils import escape as xml_escape
from PIL import Image, ImageDraw, ImageFont
from django.http import HttpResponse
from django.utils import timezone
from .constants import PLATFORM_LOGO_PATH, RUPEE_SYMBOL


def _open_platform_logo(max_width=320, max_height=None):
    if not PLATFORM_LOGO_PATH.exists():
        return None
    with Image.open(PLATFORM_LOGO_PATH) as logo:
        logo = logo.convert("RGBA")
        width, height = logo.size
        target_width = min(max_width, width)
        target_height = max(int(height * (target_width / width)), 1)
        if max_height and target_height > max_height:
            target_height = max_height
            target_width = max(int(width * (target_height / height)), 1)
        return logo.resize((target_width, target_height), Image.Resampling.LANCZOS)


def _load_platform_logo(max_width=320):
    resized = _open_platform_logo(max_width=max_width)
    if resized is None:
        return None
    buffer = BytesIO()
    resized.save(buffer, format="PNG")
    return buffer.getvalue()


def _load_font(size, bold=False):
    candidates = [
        "/usr/share/fonts/noto/NotoSans-Bold.ttf" if bold else "/usr/share/fonts/noto/NotoSans-Regular.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/noto/NotoSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/noto/NotoSans-Regular.ttf",
        "/usr/share/fonts/truetype/lohit-devanagari/Lohit-Devanagari.ttf",
        "/usr/share/fonts/truetype/liberation2/LiberationSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/liberation2/LiberationSans-Regular.ttf",
        "/usr/share/fonts/liberation/LiberationSans-Bold.ttf" if bold else "/usr/share/fonts/liberation/LiberationSans-Regular.ttf",
        "/usr/share/fonts/gnu-free/FreeSansBold.otf" if bold else "/usr/share/fonts/gnu-free/FreeSans.otf",
    ]
    for path in candidates:
        if Path(path).exists():
            return ImageFont.truetype(path, size=size)
    return ImageFont.load_default()


def _wrap_text(draw, text, font, max_width):
    words = str(text).split()
    if not words:
        return [""]
    lines = []
    current = words[0]
    for word in words[1:]:
        candidate = f"{current} {word}"
        if draw.textbbox((0, 0), candidate, font=font)[2] <= max_width:
            current = candidate
        else:
            lines.append(current)
            current = word
    lines.append(current)
    return lines


def _export_sections(payload):
    filters = payload["filters"]
    platform = payload["platform"]
    summary = payload["summary"]
    trends = payload["trends"]
    revenue_by_date = {item["date"]: item["value"] for item in trends["revenue"]}
    complaints_by_date = {item["date"]: item["value"] for item in trends["complaints"]}
    trend_rows = [
        [item["date"], item["label"], item["value"], revenue_by_date.get(item["date"], 0), complaints_by_date.get(item["date"], 0)]
        for item in trends["bookings"]
    ]
    return {
        "platform": platform,
        "filters": filters,
        "summary": summary,
        "trend_rows": trend_rows,
        "top_psychologists": payload["top_psychologists"],
        "specializations": payload["specializations"],
        "upcoming_appointments": payload["upcoming_appointments"],
        "recent_activity": payload["recent_activity"],
    }
def _xml_escape(value):
    return xml_escape(str(value), {'"': "&quot;"})


def xlsx_response(payload, filename):
    sections = _export_sections(payload)
    logo_bytes = _load_platform_logo(max_width=320)

    kpi_rows = [
        ("Total users", sections["summary"]["total_users"]),
        ("Total patients", sections["summary"]["total_patients"]),
        ("New patients", sections["summary"]["new_patients"]),
        ("Total psychologists", sections["summary"]["total_psychologists"]),
        ("New psychologists", sections["summary"]["new_psychologists"]),
        ("Pending applications", sections["summary"]["pending_applications"]),
        ("Approved applications", sections["summary"]["approved_applications"]),
        ("Period bookings", sections["summary"]["period_bookings"]),
        ("Gross revenue", sections["summary"]["gross_revenue"]),
        ("Wallet volume", sections["summary"]["wallet_volume"]),
        ("Open complaints", sections["summary"]["open_complaints"]),
        ("Average rating", sections["summary"]["average_rating"]),
        ("Completion rate", f"{sections['summary']['completion_rate']}%"),
        ("Cancellation rate", f"{sections['summary']['cancellation_rate']}%"),
    ]

    trend_headers = ["Date", "Day", "Bookings", "Revenue", "Complaints"]
    top_headers = ["Psychologist", "Sessions", "Revenue", "Rating"]
    special_headers = ["Specialization", "Psychologists"]
    upcoming_headers = ["Patient", "Psychologist", "Date", "Time", "Payment", "Amount"]
    recent_headers = ["Activity", "Type", "Status", "Time"]

    workbook = BytesIO()
    with zipfile.ZipFile(workbook, "w", zipfile.ZIP_DEFLATED) as archive:
        if logo_bytes:
            archive.writestr("xl/media/image1.png", logo_bytes)

        content_types = [
            '<?xml version="1.0" encoding="UTF-8"?>',
            '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">',
            '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>',
            '<Default Extension="xml" ContentType="application/xml"/>',
            '<Default Extension="png" ContentType="image/png"/>',
            '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>',
            '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>',
            '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>',
        ]
        if logo_bytes:
            content_types.append('<Override PartName="/xl/drawings/drawing1.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>')
        content_types.append("</Types>")
        archive.writestr("[Content_Types].xml", "".join(content_types))

        archive.writestr(
            "_rels/.rels",
            """<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>""",
        )
        archive.writestr(
            "xl/workbook.xml",
            """<?xml version="1.0" encoding="UTF-8"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Dashboard" sheetId="1" r:id="rId1"/></sheets></workbook>""",
        )
        archive.writestr(
            "xl/_rels/workbook.xml.rels",
            """<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>""",
        )
        if logo_bytes:
            archive.writestr(
                "xl/worksheets/_rels/sheet1.xml.rels",
                """<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing1.xml"/></Relationships>""",
            )
            archive.writestr(
                "xl/drawings/_rels/drawing1.xml.rels",
                """<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/image1.png"/></Relationships>""",
            )

        archive.writestr(
            "xl/styles.xml",
            """<?xml version="1.0" encoding="UTF-8"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="5">
    <font><sz val="11"/><name val="Calibri"/></font>
    <font><b/><sz val="16"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>
    <font><sz val="11"/><color rgb="FF64748B"/><name val="Calibri"/></font>
    <font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>
    <font><b/><sz val="11"/><color rgb="FF0F172A"/><name val="Calibri"/></font>
  </fonts>
  <fills count="6">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF0F172A"/><bgColor rgb="FF0F172A"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF1D4ED8"/><bgColor rgb="FF1D4ED8"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFE2E8F0"/><bgColor rgb="FFE2E8F0"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFF8FAFC"/><bgColor rgb="FFF8FAFC"/></patternFill></fill>
  </fills>
  <borders count="2">
    <border><left/><right/><top/><bottom/><diagonal/></border>
    <border><left style="thin"><color rgb="FFCBD5E1"/></left><right style="thin"><color rgb="FFCBD5E1"/></right><top style="thin"><color rgb="FFCBD5E1"/></top><bottom style="thin"><color rgb="FFCBD5E1"/></bottom><diagonal/></border>
  </borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="8">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="1" fillId="2" borderId="0" applyFont="1" applyFill="1"/>
    <xf numFmtId="0" fontId="2" fillId="0" borderId="0" applyFont="1"/>
    <xf numFmtId="0" fontId="3" fillId="3" borderId="0" applyFont="1" applyFill="1"/>
    <xf numFmtId="0" fontId="4" fillId="4" borderId="1" applyFont="1" applyFill="1" applyBorder="1"/>
    <xf numFmtId="0" fontId="0" fillId="5" borderId="1" applyFill="1" applyBorder="1"/>
    <xf numFmtId="0" fontId="3" fillId="3" borderId="1" applyFont="1" applyFill="1" applyBorder="1"/>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" applyBorder="1"/>
  </cellXfs>
  <cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>""",
        )

        cells = [
            '<c r="C1" t="inlineStr" s="1"><is><t>KOODE Platform Report</t></is></c>',
            f'<c r="C2" t="inlineStr" s="2"><is><t>{_xml_escape(sections["platform"]["tagline"])}</t></is></c>',
            '<c r="A4" t="inlineStr" s="3"><is><t>Platform Details</t></is></c>',
            '<c r="A5" t="inlineStr" s="4"><is><t>Platform name</t></is></c>',
            f'<c r="C5" t="inlineStr" s="5"><is><t>{_xml_escape(sections["platform"]["name"])}</t></is></c>',
            '<c r="A6" t="inlineStr" s="4"><is><t>Email</t></is></c>',
            f'<c r="C6" t="inlineStr" s="5"><is><t>{_xml_escape(sections["platform"]["support_email"])}</t></is></c>',
            '<c r="A7" t="inlineStr" s="4"><is><t>Phone</t></is></c>',
            f'<c r="C7" t="inlineStr" s="5"><is><t>{_xml_escape(sections["platform"]["phone"])}</t></is></c>',
            '<c r="A8" t="inlineStr" s="4"><is><t>Website</t></is></c>',
            f'<c r="C8" t="inlineStr" s="5"><is><t>{_xml_escape(sections["platform"]["website"])}</t></is></c>',
            '<c r="A9" t="inlineStr" s="4"><is><t>Report period</t></is></c>',
            f'<c r="C9" t="inlineStr" s="5"><is><t>{_xml_escape(f"{sections["filters"]["start"]} to {sections["filters"]["end"]}")}</t></is></c>',
            '<c r="A10" t="inlineStr" s="4"><is><t>Generated by</t></is></c>',
            f'<c r="C10" t="inlineStr" s="5"><is><t>{_xml_escape(sections["platform"]["generated_by"])}</t></is></c>',
            '<c r="A11" t="inlineStr" s="4"><is><t>Generated at</t></is></c>',
            f'<c r="C11" t="inlineStr" s="5"><is><t>{_xml_escape(timezone.localtime(datetime.fromisoformat(sections["platform"]["generated_at"])).strftime("%d %b %Y, %I:%M %p"))}</t></is></c>',
            '<c r="A13" t="inlineStr" s="3"><is><t>Summary Metrics</t></is></c>',
            '<c r="A14" t="inlineStr" s="6"><is><t>Metric</t></is></c>',
            '<c r="C14" t="inlineStr" s="6"><is><t>Value</t></is></c>',
        ]
        for row_index, (label, value) in enumerate(kpi_rows, start=15):
            cells.append(f'<c r="A{row_index}" t="inlineStr" s="4"><is><t>{_xml_escape(label)}</t></is></c>')
            cells.append(f'<c r="C{row_index}" t="inlineStr" s="5"><is><t>{_xml_escape(value)}</t></is></c>')

        trend_start = 15 + len(kpi_rows) + 2
        cells.append(f'<c r="A{trend_start}" t="inlineStr" s="3"><is><t>Daily Trends</t></is></c>')
        for col, header in zip(["A", "B", "C", "D", "E"], trend_headers):
            cells.append(f'<c r="{col}{trend_start + 1}" t="inlineStr" s="6"><is><t>{_xml_escape(header)}</t></is></c>')
        for idx, row in enumerate(sections["trend_rows"], start=trend_start + 2):
            for col, value in zip(["A", "B", "C", "D", "E"], row):
                cells.append(f'<c r="{col}{idx}" t="inlineStr" s="7"><is><t>{_xml_escape(value)}</t></is></c>')

        top_start = trend_start + 2 + len(sections["trend_rows"]) + 2
        cells.append(f'<c r="A{top_start}" t="inlineStr" s="3"><is><t>Top Psychologists</t></is></c>')
        for col, header in zip(["A", "B", "C", "D"], top_headers):
            cells.append(f'<c r="{col}{top_start + 1}" t="inlineStr" s="6"><is><t>{_xml_escape(header)}</t></is></c>')
        for idx, item in enumerate(sections["top_psychologists"], start=top_start + 2):
            row = [item["name"], item["completed_sessions"], item["revenue"], item["average_rating"] or ""]
            for col, value in zip(["A", "B", "C", "D"], row):
                cells.append(f'<c r="{col}{idx}" t="inlineStr" s="7"><is><t>{_xml_escape(value)}</t></is></c>')

        spec_start = top_start + 2 + len(sections["top_psychologists"]) + 2
        cells.append(f'<c r="A{spec_start}" t="inlineStr" s="3"><is><t>Top Specializations</t></is></c>')
        for col, header in zip(["A", "B"], special_headers):
            cells.append(f'<c r="{col}{spec_start + 1}" t="inlineStr" s="6"><is><t>{_xml_escape(header)}</t></is></c>')
        for idx, item in enumerate(sections["specializations"], start=spec_start + 2):
            row = [item["name"], item["psychologists"]]
            for col, value in zip(["A", "B"], row):
                cells.append(f'<c r="{col}{idx}" t="inlineStr" s="7"><is><t>{_xml_escape(value)}</t></is></c>')

        upcoming_start = spec_start + 2 + len(sections["specializations"]) + 2
        cells.append(f'<c r="A{upcoming_start}" t="inlineStr" s="3"><is><t>Upcoming Appointments</t></is></c>')
        for col, header in zip(["A", "B", "C", "D", "E", "F"], upcoming_headers):
            cells.append(f'<c r="{col}{upcoming_start + 1}" t="inlineStr" s="6"><is><t>{_xml_escape(header)}</t></is></c>')
        for idx, item in enumerate(sections["upcoming_appointments"], start=upcoming_start + 2):
            row = [item["patient"], item["psychologist"], item["date"], item["start_time"], item["payment_status"], item["amount"]]
            for col, value in zip(["A", "B", "C", "D", "E", "F"], row):
                cells.append(f'<c r="{col}{idx}" t="inlineStr" s="7"><is><t>{_xml_escape(value)}</t></is></c>')

        recent_start = upcoming_start + 2 + len(sections["upcoming_appointments"]) + 2
        cells.append(f'<c r="A{recent_start}" t="inlineStr" s="3"><is><t>Recent Activity</t></is></c>')
        for col, header in zip(["A", "B", "C", "D"], recent_headers):
            cells.append(f'<c r="{col}{recent_start + 1}" t="inlineStr" s="6"><is><t>{_xml_escape(header)}</t></is></c>')
        for idx, item in enumerate(sections["recent_activity"], start=recent_start + 2):
            row = [item["title"], item["type"], item["status"], item["display_time"]]
            for col, value in zip(["A", "B", "C", "D"], row):
                cells.append(f'<c r="{col}{idx}" t="inlineStr" s="7"><is><t>{_xml_escape(value)}</t></is></c>')

        max_row = recent_start + 1 + len(sections["recent_activity"]) + 2
        row_map = {}
        for cell_xml in cells:
            ref = cell_xml.split('r="')[1].split('"')[0]
            row_number = "".join(ch for ch in ref if ch.isdigit())
            row_map.setdefault(row_number, []).append(cell_xml)

        sheet_rows = []
        for row_number in sorted(row_map, key=lambda x: int(x)):
            sheet_rows.append(f'<row r="{row_number}" spans="1:10">{"".join(row_map[row_number])}</row>')

        merge_cells = [
            "C1:J1",
            "C2:J2",
            "A4:J4",
            "A13:J13",
            f"A{trend_start}:J{trend_start}",
            f"A{top_start}:J{top_start}",
            f"A{spec_start}:J{spec_start}",
            f"A{upcoming_start}:J{upcoming_start}",
            f"A{recent_start}:J{recent_start}",
        ]

        worksheet = [
            '<?xml version="1.0" encoding="UTF-8"?>',
            '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">',
            '<sheetViews><sheetView workbookViewId="0" tabSelected="1"/></sheetViews>',
            '<sheetFormatPr defaultRowHeight="20"/>',
            '<cols>',
            '<col min="1" max="1" width="28"/>',
            '<col min="2" max="2" width="18"/>',
            '<col min="3" max="3" width="28"/>',
            '<col min="4" max="4" width="18"/>',
            '<col min="5" max="5" width="18"/>',
            '<col min="6" max="6" width="18"/>',
            '<col min="7" max="10" width="16"/>',
            '</cols>',
            '<sheetData>',
            "".join(sheet_rows),
            '</sheetData>',
            f'<mergeCells count="{len(merge_cells)}">',
            "".join(f'<mergeCell ref="{ref}"/>' for ref in merge_cells),
            '</mergeCells>',
            '<pageMargins left="0.3" right="0.3" top="0.5" bottom="0.5" header="0.2" footer="0.2"/>',
        ]
        if logo_bytes:
            worksheet.append('<drawing r:id="rId1"/>')
        worksheet.append('</worksheet>')

        archive.writestr("xl/worksheets/sheet1.xml", "".join(worksheet))
        if logo_bytes:
            archive.writestr(
                "xl/drawings/drawing1.xml",
                """<?xml version="1.0" encoding="UTF-8"?>
<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <xdr:oneCellAnchor>
    <xdr:from><xdr:col>0</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>0</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from>
    <xdr:ext cx="3048000" cy="847725"/>
    <xdr:pic>
      <xdr:nvPicPr><xdr:cNvPr id="1" name="Koode Platform Logo"/><xdr:cNvPicPr/></xdr:nvPicPr>
      <xdr:blipFill><a:blip r:embed="rId1"/><a:stretch><a:fillRect/></a:stretch></xdr:blipFill>
      <xdr:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="3048000" cy="847725"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></xdr:spPr>
    </xdr:pic>
    <xdr:clientData/>
  </xdr:oneCellAnchor>
</xdr:wsDr>""",
            )

    response = HttpResponse(workbook.getvalue(), content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    response["Content-Disposition"] = f'attachment; filename="{filename}"'
    return response


def _pdf_money(value, symbol=True):
    amount = float(value or 0)
    formatted = f"{amount:,.1f}" if amount % 1 else f"{amount:,.0f}"
    return f"{RUPEE_SYMBOL}{formatted}" if symbol else formatted


def _draw_right_text(draw, xy, text, font, fill):
    x, y = xy
    bbox = draw.textbbox((0, 0), str(text), font=font)
    draw.text((x - (bbox[2] - bbox[0]), y), str(text), font=font, fill=fill)


def _draw_section_title(draw, x, y, title, fonts, colors):
    font_section = fonts["section"]
    text = colors["text"]
    blue = colors["blue"]
    draw.rectangle((x, y + 8, x + 7, y + 44), fill=blue)
    draw.text((x + 23, y), title.upper(), font=font_section, fill=text)


def _draw_metric_card(draw, box, label, value, note, fonts, colors):
    x1, y1, x2, y2 = box
    draw.rounded_rectangle(box, radius=6, fill="#ffffff", outline=colors["border"], width=1)
    draw.text((x1 + 24, y1 + 24), label.upper(), font=fonts["card_label"], fill=colors["muted"])
    draw.text((x1 + 24, y1 + 64), str(value), font=fonts["card_value"], fill=colors["blue"])
    if note:
        note_y = y1 + 116
        for line in _wrap_text(draw, note, fonts["small"], x2 - x1 - 48)[:2]:
            draw.text((x1 + 24, note_y), line, font=fonts["small"], fill=colors["light_text"])
            note_y += 18


def _draw_key_value_table(draw, x, y, width, rows, fonts, colors, row_height=54):
    draw.rectangle((x, y, x + width, y + row_height * len(rows)), fill="#ffffff", outline=colors["border"], width=1)
    for idx, (label, value) in enumerate(rows):
        row_y = y + idx * row_height
        if idx:
            draw.line((x, row_y, x + width, row_y), fill=colors["border"], width=1)
        draw.text((x + 20, row_y + 16), str(label), font=fonts["body"], fill=colors["body"])
        _draw_right_text(draw, (x + width - 20, row_y + 16), value, fonts["body"], colors["body"])


def _draw_data_table(draw, x, y, widths, headers, rows, fonts, colors, row_height=52, header_height=58, aligns=None):
    table_width = sum(widths)
    aligns = aligns or ["left"] * len(widths)
    draw.rectangle((x, y, x + table_width, y + header_height), fill=colors["table_header"], outline=colors["border"], width=1)
    col_x = x
    for idx, (header, col_width) in enumerate(zip(headers, widths)):
        if aligns[idx] == "right":
            _draw_right_text(draw, (col_x + col_width - 20, y + 18), header.upper(), fonts["table_header"], colors["header_text"])
        elif aligns[idx] == "center":
            bbox = draw.textbbox((0, 0), header.upper(), font=fonts["table_header"])
            draw.text((col_x + (col_width - (bbox[2] - bbox[0])) / 2, y + 18), header.upper(), font=fonts["table_header"], fill=colors["header_text"])
        else:
            draw.text((col_x + 20, y + 18), header.upper(), font=fonts["table_header"], fill=colors["header_text"])
        col_x += col_width

    current_y = y + header_height
    for row in rows:
        draw.rectangle((x, current_y, x + table_width, current_y + row_height), fill="#ffffff", outline=colors["border"], width=1)
        col_x = x
        for idx, (cell, col_width) in enumerate(zip(row, widths)):
            cell_text = str(cell)
            if aligns[idx] == "right":
                _draw_right_text(draw, (col_x + col_width - 20, current_y + 16), cell_text, fonts["body"], colors["body"])
            elif aligns[idx] == "center":
                bbox = draw.textbbox((0, 0), cell_text, font=fonts["body"])
                draw.text((col_x + (col_width - (bbox[2] - bbox[0])) / 2, current_y + 16), cell_text, font=fonts["body"], fill=colors["body"])
            else:
                draw.text((col_x + 20, current_y + 16), cell_text, font=fonts["body"], fill=colors["body"])
            col_x += col_width
        current_y += row_height


def _draw_badge(draw, x, y, text, bg, fg, font):
    text = str(text).upper()
    bbox = draw.textbbox((0, 0), text, font=font)
    width = bbox[2] - bbox[0] + 26
    draw.rounded_rectangle((x, y, x + width, y + 26), radius=13, fill=bg)
    draw.text((x + 13, y + 5), text, font=font, fill=fg)


def _draw_activity_table(draw, x, y, width, rows, fonts, colors):
    col_widths = [width * 0.36, width * 0.28, width * 0.36]
    header_height = 58
    row_height = 96
    draw.rectangle((x, y, x + width, y + header_height), fill=colors["table_header"], outline=colors["border"], width=1)
    header_x = x
    for header, col_width in zip(["Activity", "Type", "Status"], col_widths):
        draw.text((header_x + 20, y + 18), header.upper(), font=fonts["table_header"], fill=colors["header_text"])
        header_x += col_width
    current_y = y + header_height
    for item in rows:
        draw.rectangle((x, current_y, x + width, current_y + row_height), fill="#ffffff", outline=colors["border"], width=1)
        title_lines = _wrap_text(draw, item["title"], fonts["body"], col_widths[0] - 30)[:2]
        text_y = current_y + 16
        for line in title_lines:
            draw.text((x + 20, text_y), line, font=fonts["body"], fill=colors["body"])
            text_y += 20
        draw.text((x + 20, current_y + row_height - 30), item["display_time"], font=fonts["tiny"], fill=colors["light_text"])
        type_bg, type_fg = ("#eef2f7", "#334155")
        status_bg, status_fg = ("#eef2f7", "#334155")
        if item["type"] == "complaint":
            type_bg, type_fg = "#fef3c7", "#92400e"
        if item["status"] in ["RESOLVED", "COMPLETED"]:
            status_bg, status_fg = "#dcfce7", "#166534"
        elif item["status"] == "CANCELLED":
            status_bg, status_fg = "#fee2e2", "#991b1b"
        elif item["status"] in ["PENDING", "SUBMITTED"]:
            status_bg, status_fg = "#fef3c7", "#92400e"
        _draw_badge(draw, x + col_widths[0] + 20, current_y + 36, item["type"], type_bg, type_fg, fonts["badge"])
        _draw_badge(draw, x + col_widths[0] + col_widths[1] + 20, current_y + 36, item["status"], status_bg, status_fg, fonts["badge"])
        current_y += row_height


def pdf_response(payload, filename):
    sections = _export_sections(payload)
    generated_at = timezone.localtime(datetime.fromisoformat(sections["platform"]["generated_at"])).strftime("%d %b %Y, %I:%M %p")
    width, height = 1240, 1754
    colors = {
        "page": "#f3f4f6",
        "header": "#111111",
        "blue": "#2563eb",
        "text": "#171717",
        "body": "#334155",
        "muted": "#6b7280",
        "light_text": "#9ca3af",
        "border": "#d7dce2",
        "table_header": "#eef2f7",
        "header_text": "#475569",
    }
    fonts = {
        "title": _load_font(54, bold=True),
        "tagline": _load_font(22),
        "meta": _load_font(19),
        "meta_bold": _load_font(19, bold=True),
        "section": _load_font(30, bold=True),
        "card_label": _load_font(18, bold=True),
        "card_value": _load_font(40, bold=True),
        "small": _load_font(16),
        "body": _load_font(21),
        "table_header": _load_font(18, bold=True),
        "badge": _load_font(14, bold=True),
        "tiny": _load_font(15),
    }

    def draw_meta_line(draw, x, y, label, value):
        draw.text((x, y), label, font=fonts["meta_bold"], fill="#e5e7eb")
        label_width = draw.textbbox((0, 0), label, font=fonts["meta_bold"])[2]
        draw.text((x + label_width + 6, y), str(value), font=fonts["meta"], fill="#e5e7eb")

    def draw_header(page, draw):
        draw.rectangle((0, 0, width, 250), fill=colors["header"])
        logo = _open_platform_logo(max_width=280, max_height=88)
        if logo:
            page.alpha_composite(logo, (880, 30))
        draw.text((88, 34), "KOODE PLATFORM REPORT", font=fonts["title"], fill="#ffffff")
        draw.text((88, 96), "Mental Wellness Consultation Platform", font=fonts["tagline"], fill="#9ca3af")
        draw_meta_line(draw, 88, 145, "Report Period:", f"{sections['filters']['start']} to {sections['filters']['end']}")
        draw_meta_line(draw, 88, 166, "Generated At:", generated_at)
        draw_meta_line(draw, 88, 187, "Generated By:", sections["platform"]["generated_by"])
        draw_meta_line(draw, 930, 145, "Website:", sections["platform"]["website"])
        draw_meta_line(draw, 930, 166, "Email:", sections["platform"]["support_email"])
        draw_meta_line(draw, 930, 187, "Phone:", sections["platform"]["phone"])
        draw.rectangle((0, 250, width, 260), fill=colors["blue"])

    page1 = Image.new("RGBA", (width, height), colors["page"])
    draw = ImageDraw.Draw(page1)
    draw_header(page1, draw)

    _draw_section_title(draw, 88, 298, "Executive Summary", fonts, colors)
    card_y = 370
    card_w = 245
    gap = 17
    _draw_metric_card(draw, (88, card_y, 88 + card_w, card_y + 124), "Gross Revenue", _pdf_money(sections["summary"]["gross_revenue"]), "", fonts, colors)
    _draw_metric_card(
        draw,
        (88 + (card_w + gap), card_y, 88 + (card_w + gap) + card_w, card_y + 160),
        "Total Bookings",
        sections["summary"]["period_bookings"],
        f"{sections['summary']['period_completed_consultations']} Completed / {sections['summary']['cancelled_bookings']} Cancelled",
        fonts,
        colors,
    )
    _draw_metric_card(
        draw,
        (88 + 2 * (card_w + gap), card_y, 88 + 2 * (card_w + gap) + card_w, card_y + 142),
        "Total Users",
        sections["summary"]["total_users"],
        f"{sections['summary']['active_patients']} Active Patients",
        fonts,
        colors,
    )
    _draw_metric_card(
        draw,
        (88 + 3 * (card_w + gap), card_y, 88 + 3 * (card_w + gap) + card_w, card_y + 142),
        "Psychologists",
        sections["summary"]["total_psychologists"],
        f"{sections['summary']['active_psychologists']} Active / {sections['summary']['approved_applications']} Approved",
        fonts,
        colors,
    )

    _draw_section_title(draw, 88, 622, "Consultation & Support", fonts, colors)
    _draw_section_title(draw, 612, 622, "Wallet & Financials", fonts, colors)
    left_rows = [
        ("Paid Bookings", sections["summary"]["paid_bookings"]),
        ("Completion Rate", f"{sections['summary']['completion_rate']}%"),
        ("Cancellation Rate", f"{sections['summary']['cancellation_rate']}%"),
        ("Consultation Minutes", f"{sections['summary']['platform_session_minutes']} mins"),
        ("Average Rating", f"{sections['summary']['average_rating']} ({sections['summary']['total_reviews']} reviews)"),
        ("Open Complaints", sections["summary"]["open_complaints"]),
    ]
    right_rows = [
        ("Wallet Volume", _pdf_money(sections["summary"]["wallet_volume"])),
        ("Wallet Credits", _pdf_money(sections["summary"]["wallet_credits"])),
        ("Wallet Debits", _pdf_money(sections["summary"]["wallet_debits"])),
        ("Pending Bookings", sections["summary"]["pending_bookings"]),
        ("Resolved Complaints", sections["summary"]["resolved_complaints"]),
        ("High Priority Complaints", sections["summary"]["high_priority_complaints"]),
    ]
    _draw_key_value_table(draw, 88, 688, 508, left_rows, fonts, colors)
    _draw_key_value_table(draw, 612, 688, 508, right_rows, fonts, colors)

    _draw_section_title(draw, 88, 1074, "Top Performing Psychologists", fonts, colors)
    top_rows = [
        [item["name"], item["completed_sessions"], _pdf_money(item["revenue"], symbol=False), item["average_rating"] or "-"]
        for item in sections["top_psychologists"]
    ]
    _draw_data_table(
        draw,
        88,
        1130,
        [390, 210, 310, 150],
        ["Psychologist", "Sessions", "Revenue (₹)", "Rating"],
        top_rows,
        fonts,
        colors,
        aligns=["left", "center", "right", "right"],
    )

    page2 = Image.new("RGBA", (width, height), colors["page"])
    draw = ImageDraw.Draw(page2)
    _draw_section_title(draw, 88, 143, "Specialization Mix", fonts, colors)
    _draw_section_title(draw, 612, 143, "Recent Activity", fonts, colors)
    spec_rows = [[item["name"], item["psychologists"]] for item in sections["specializations"][:4]]
    _draw_data_table(
        draw,
        88,
        197,
        [350, 155],
        ["Specialization", "Count"],
        spec_rows,
        fonts,
        colors,
        row_height=54,
        aligns=["left", "right"],
    )
    _draw_activity_table(draw, 612, 197, 508, sections["recent_activity"][:4], fonts, colors)
    draw.line((88, 727, 1120, 727), fill=colors["border"], width=1)
    footer = "Generated by Koode Internal Systems | www.koode.in"
    footer_bbox = draw.textbbox((0, 0), footer, font=fonts["small"])
    draw.text(((width - (footer_bbox[2] - footer_bbox[0])) / 2, 752), footer, font=fonts["small"], fill=colors["light_text"])

    pages = [page1.convert("RGB"), page2.convert("RGB")]

    pdf = BytesIO()
    pages[0].save(pdf, format="PDF", save_all=True, append_images=pages[1:], resolution=150.0)
    response = HttpResponse(pdf.getvalue(), content_type="application/pdf")
    response["Content-Disposition"] = f'attachment; filename="{filename}"'
    return response


def _export_rows(payload):
    filters = payload["filters"]
    platform = payload["platform"]
    summary = payload["summary"]
    rows = [
        ["Platform logo", platform["logo_text"]],
        [platform["name"], platform["tagline"]],
        ["Email", platform["support_email"]],
        ["Phone", platform["phone"]],
        ["Website", platform["website"]],
        ["Report period", f"{filters['start']} to {filters['end']}"],
        ["Generated at", timezone.localtime(datetime.fromisoformat(platform["generated_at"])).strftime("%d %b %Y, %I:%M %p")],
        ["Generated by", platform["generated_by"]],
        [],
        ["Platform Summary", "Value"],
        ["Total users", summary["total_users"]],
        ["Total patients", summary["total_patients"]],
        ["New patients in period", summary["new_patients"]],
        ["Active patients", summary["active_patients"]],
        ["Total psychologists", summary["total_psychologists"]],
        ["New psychologists in period", summary["new_psychologists"]],
        ["Active psychologists", summary["active_psychologists"]],
        ["Pending applications", summary["pending_applications"]],
        ["Approved applications", summary["approved_applications"]],
        ["Rejected applications", summary["rejected_applications"]],
        [],
        ["Bookings & Consultations", "Value"],
        ["All-time bookings", summary["total_bookings"]],
        ["Bookings in period", summary["period_bookings"]],
        ["Paid bookings", summary["paid_bookings"]],
        ["Pending bookings", summary["pending_bookings"]],
        ["Confirmed bookings", summary["confirmed_bookings"]],
        ["Cancelled bookings", summary["cancelled_bookings"]],
        ["Today appointments", summary["today_appointments"]],
        ["All-time completed consultations", summary["completed_consultations"]],
        ["Consultations in period", summary["period_consultations"]],
        ["Completed consultations in period", summary["period_completed_consultations"]],
        ["Ongoing consultations", summary["ongoing_consultations"]],
        ["Consultation minutes in period", summary["platform_session_minutes"]],
        ["Completion rate", f"{summary['completion_rate']}%"],
        ["Cancellation rate", f"{summary['cancellation_rate']}%"],
        [],
        ["Finance & Feedback", "Value"],
        ["Gross revenue", summary["gross_revenue"]],
        ["Wallet volume", summary["wallet_volume"]],
        ["Wallet credits", summary["wallet_credits"]],
        ["Wallet debits", summary["wallet_debits"]],
        ["Average rating", summary["average_rating"]],
        ["Total reviews", summary["total_reviews"]],
        [],
        ["Complaints", "Value"],
        ["Open complaints", summary["open_complaints"]],
        ["Complaints in period", summary["period_complaints"]],
        ["Resolved complaints in period", summary["resolved_complaints"]],
        ["High priority open complaints", summary["high_priority_complaints"]],
        [],
        ["Daily trend", "Bookings", "Revenue", "Complaints"],
    ]
    revenue_by_date = {item["date"]: item["value"] for item in payload["trends"]["revenue"]}
    complaints_by_date = {item["date"]: item["value"] for item in payload["trends"]["complaints"]}
    for item in payload["trends"]["bookings"]:
        rows.append([item["date"], item["value"], revenue_by_date.get(item["date"], 0), complaints_by_date.get(item["date"], 0)])

    rows.extend([[], ["Top psychologists", "Sessions", "Revenue", "Rating"]])
    for item in payload["top_psychologists"]:
        rows.append([item["name"], item["completed_sessions"], item["revenue"], item["average_rating"] or ""])

    rows.extend([[], ["Top specializations", "Psychologists"]])
    for item in payload["specializations"]:
        rows.append([item["name"], item["psychologists"]])

    rows.extend([[], ["Upcoming appointments", "Psychologist", "Date", "Time", "Payment", "Amount"]])
    for item in payload["upcoming_appointments"]:
        rows.append([item["patient"], item["psychologist"], item["date"], item["start_time"], item["payment_status"], item["amount"]])

    rows.extend([[], ["Recent activity", "Type", "Status", "Time"]])
    for item in payload["recent_activity"]:
        rows.append([item["title"], item["type"], item["status"], item["display_time"]])

    return rows
