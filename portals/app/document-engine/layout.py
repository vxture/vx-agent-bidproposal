"""Fixed, isolated LibreOffice adapter for Bid document layout.

@package @bidproposal/app
@layer Infrastructure
@category DocumentLayout
@author AI-Generated
@date 2026-11-25
"""
import copy
import json
import os
from pathlib import Path, PurePosixPath
import re
import subprocess
import sys
import time
import zipfile
from lxml import etree as E

W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
R = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
NS = {"w": W, "r": R}
PARSER = E.XMLParser(resolve_entities=False, no_network=True, load_dtd=False)
DOCUMENT_RELATIONSHIPS = "word/_rels/document.xml.rels"
CONTENT_TYPES = "[Content_Types].xml"

# --- Strict OOXML preparation --------------------------------------------
def xml(data):
    if b"<!DOCTYPE" in data.upper() or b"<!ENTITY" in data.upper():
        raise ValueError("DTD and entities are not supported")
    return E.fromstring(data, parser=PARSER)


def read_package(path):
    with zipfile.ZipFile(path) as archive:
        parts = {}
        total = 0
        for entry in archive.infolist():
            name = entry.filename
            total += entry.file_size
            if len(parts) >= 2000 or total > 80_000_000 or entry.file_size > 20_000_000:
                raise ValueError("Document exceeds layout limits")
            if name in parts or name.startswith("/") or ".." in PurePosixPath(name).parts or "\\" in name:
                raise ValueError("Invalid document part")
            if (entry.external_attr >> 16) & 0o170000 == 0o120000:
                raise ValueError("Symbolic links are not supported")
            if name.lower().endswith(".bin") or re.search(r"vbaProject|activeX|embeddings/", name, re.I):
                raise ValueError("Active document content is not supported")
            data = archive.read(entry)
            if name.endswith((".xml", ".rels")):
                root = xml(data)
                if root.xpath("//*[local-name()='altChunk' or local-name()='object']"):
                    raise ValueError("Embedded content is not supported")
                instructions = "".join(root.xpath("//*[local-name()='instrText']/text() | //@*[local-name()='instr']"))
                if re.search(r"\b(DDE|DDEAUTO|INCLUDETEXT|INCLUDEPICTURE|DATABASE|LINK)\b", instructions, re.I):
                    raise ValueError("External fields are not supported")
                for rel in root.xpath("//*[local-name()='Relationship' and @TargetMode='External']"):
                    if not rel.get("Type", "").endswith("/hyperlink"):
                        raise ValueError("External document resources are not supported")
            parts[name] = data
        if "word/document.xml" not in parts or "word/styles.xml" not in parts:
            raise ValueError("Not a Word document")
        return parts


def encode(root):
    return E.tostring(root, xml_declaration=True, encoding="UTF-8", standalone=True)


def mark_headings(body):
    """Make generated heading levels explicit before any template style mapping."""
    for paragraph in body.findall(".//w:p", NS):
        prop = paragraph.find("w:pPr", NS)
        style = prop.find("w:pStyle", NS) if prop is not None else None
        ident = style.get("{" + W + "}val", "") if style is not None else ""
        if not re.fullmatch(r"Heading[1-6]", ident):
            continue
        for old in prop.findall("w:numPr", NS) + prop.findall("w:outlineLvl", NS):
            prop.remove(old)
        num = E.SubElement(prop, "{" + W + "}numPr")
        E.SubElement(num, "{" + W + "}numId").set("{" + W + "}val", "0")
        E.SubElement(prop, "{" + W + "}outlineLvl").set("{" + W + "}val", str(int(ident[-1]) - 1))


def default_page_parts(parts, fields):
    """Add standard-page furniture only when no user template was selected."""
    document = xml(parts["word/document.xml"])
    section = document.find("w:body/w:sectPr", NS)
    if section is None:
        raise ValueError("Generated document has no page section")
    rel_name = DOCUMENT_RELATIONSHIPS
    relationship_ns = "http://schemas.openxmlformats.org/package/2006/relationships"
    rels = xml(parts[rel_name]) if rel_name in parts else E.Element("{" + relationship_ns + "}Relationships")
    types = xml(parts[CONTENT_TYPES])

    def paragraph(container):
        p = E.SubElement(container, "{" + W + "}p")
        prop = E.SubElement(p, "{" + W + "}pPr")
        E.SubElement(prop, "{" + W + "}jc").set("{" + W + "}val", "center")
        return p

    def text(p, value):
        run = E.SubElement(p, "{" + W + "}r")
        prop = E.SubElement(run, "{" + W + "}rPr")
        E.SubElement(prop, "{" + W + "}sz").set("{" + W + "}val", "18")
        E.SubElement(prop, "{" + W + "}szCs").set("{" + W + "}val", "18")
        node = E.SubElement(run, "{" + W + "}t")
        node.set("{http://www.w3.org/XML/1998/namespace}space", "preserve")
        node.text = value

    def field(p, instruction):
        node = E.SubElement(p, "{" + W + "}fldSimple")
        node.set("{" + W + "}instr", instruction)
        text(node, "1")

    def attach(kind, content):
        if section.find("w:" + kind + "Reference", NS) is not None:
            return
        name = "word/" + kind + "BidDefault.xml"
        ident = "bidDefault" + kind.title()
        if name in parts or any(rel.get("Id") == ident for rel in rels):
            raise ValueError("Default page part conflicts with generated content")
        parts[name] = encode(content)
        rel = E.SubElement(rels, "{" + relationship_ns + "}Relationship")
        rel.set("Id", ident)
        rel.set("Type", R + "/" + kind)
        rel.set("Target", name.removeprefix("word/"))
        override = E.SubElement(types, "{" + E.QName(types).namespace + "}Override")
        override.set("PartName", "/" + name)
        override.set("ContentType", "application/vnd.openxmlformats-officedocument.wordprocessingml." + kind + "+xml")
        ref = E.Element("{" + W + "}" + kind + "Reference")
        ref.set("{" + W + "}type", "default")
        ref.set("{" + R + "}id", ident)
        section.insert(0 if kind == "header" else len(section.findall("w:headerReference", NS)), ref)

    header_text = " \u00b7 ".join(fields[key] for key in ["projectName", "documentName", "documentNumber"] if fields.get(key))
    if header_text:
        header = E.Element("{" + W + "}hdr", nsmap={"w": W})
        text(paragraph(header), header_text)
        attach("header", header)
    footer = E.Element("{" + W + "}ftr", nsmap={"w": W})
    p = paragraph(footer)
    text(p, "\u7b2c ")
    field(p, "PAGE")
    text(p, " \u9875 / \u5171 ")
    field(p, "NUMPAGES")
    text(p, " \u9875")
    attach("footer", footer)
    # The generated first page is the cover; leave its furniture empty.
    if section.find("w:titlePg", NS) is None:
        title = E.Element("{" + W + "}titlePg")
        grid = section.find("w:docGrid", NS)
        section.insert(list(section).index(grid) if grid is not None else len(section), title)
    parts["word/document.xml"] = encode(document)
    parts[rel_name], parts[CONTENT_TYPES] = encode(rels), encode(types)


def merge_document(source, template, fields):
    parts = read_package(source)
    body_xml = xml(parts["word/document.xml"])
    mark_headings(body_xml)
    parts["word/document.xml"] = encode(body_xml)
    if template.exists():
        base = read_package(template)
        base_xml = xml(base["word/document.xml"])
        sections = base_xml.findall(".//w:sectPr", NS)
        if not sections:
            raise ValueError("Template has no page section")
        section = copy.deepcopy(sections[-1])
        for kind in ["headerReference", "footerReference"]:
            if section.find("w:" + kind, NS) is None:
                for previous in reversed(sections[:-1]):
                    refs = previous.findall("w:" + kind, NS)
                    if refs:
                        for ref in refs:
                            section.insert(0, copy.deepcopy(ref))
                        break
        for number in section.findall("w:pgNumType", NS):
            section.remove(number)
        styles, generated = xml(base["word/styles.xml"]), xml(parts["word/styles.xml"])
        mapping = {}
        for style in generated.findall("w:style", NS):
            ident = style.get("{" + W + "}styleId")
            name = style.find("w:name", NS)
            match = next((candidate for candidate in styles.findall("w:style", NS)
                          if candidate.get("{" + W + "}styleId") == ident
                          or name is not None and candidate.find("w:name", NS) is not None
                          and candidate.find("w:name", NS).get("{" + W + "}val", "").lower() == name.get("{" + W + "}val", "").lower()), None)
            mapping[ident] = match.get("{" + W + "}styleId") if match is not None else ident
            if match is None:
                styles.append(copy.deepcopy(style))
        for ref in body_xml.xpath("//w:pStyle | //w:rStyle | //w:tblStyle", namespaces=NS):
            ident = ref.get("{" + W + "}val")
            if ident in mapping:
                ref.set("{" + W + "}val", mapping[ident])
        if "word/numbering.xml" in parts:
            generated_nums = xml(parts["word/numbering.xml"])
            nums = xml(base["word/numbering.xml"]) if "word/numbering.xml" in base else E.Element("{" + W + "}numbering", nsmap={"w": W})
            shift = max([10000] + [int(v) + 100 for v in nums.xpath("//@w:abstractNumId | //@w:numId", namespaces=NS) if v.isdigit()])
            for node in generated_nums.xpath("//w:abstractNum | //w:num | //w:abstractNumId", namespaces=NS):
                attr = "abstractNumId" if E.QName(node).localname == "abstractNum" else "numId" if E.QName(node).localname == "num" else "val"
                node.set("{" + W + "}" + attr, str(int(node.get("{" + W + "}" + attr)) + shift))
            for node in body_xml.findall(".//w:numId", NS):
                value = int(node.get("{" + W + "}val"))
                if value:
                    node.set("{" + W + "}val", str(value + shift))
            nums.extend(copy.deepcopy(list(generated_nums)))
            base["word/numbering.xml"] = encode(nums)
        rels = xml(base[DOCUMENT_RELATIONSHIPS])
        for index, rel in enumerate(xml(parts[DOCUMENT_RELATIONSHIPS])):
            kind = rel.get("Type", "")
            if kind.endswith("/hyperlink"):
                old, new = rel.get("Id"), "bidSourceLink" + str(index)
                for ref in body_xml.xpath("//*[@r:id]", namespaces=NS):
                    if ref.get("{" + R + "}id") == old:
                        ref.set("{" + R + "}id", new)
                rel.set("Id", new)
                rels.append(copy.deepcopy(rel))
            elif kind.endswith("/numbering") and not any(r.get("Type", "").endswith("/numbering") for r in rels):
                rel.set("Id", "bidSourceNumbering")
                rels.append(copy.deepcopy(rel))
        content_types = xml(base[CONTENT_TYPES])
        if "word/numbering.xml" in base and not any(n.get("PartName") == "/word/numbering.xml" for n in content_types):
            item = E.SubElement(content_types, "{" + E.QName(content_types).namespace + "}Override")
            item.set("PartName", "/word/numbering.xml")
            item.set("ContentType", "application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml")
        target = base_xml.find("w:body", NS)
        target.clear()
        for node in body_xml.find("w:body", NS):
            if E.QName(node).localname != "sectPr":
                target.append(copy.deepcopy(node))
        target.append(section)
        base["word/document.xml"], base["word/styles.xml"] = encode(base_xml), encode(styles)
        base[DOCUMENT_RELATIONSHIPS], base[CONTENT_TYPES] = encode(rels), encode(content_types)
        base["docProps/core.xml"] = parts["docProps/core.xml"]
        parts = base
    else:
        default_page_parts(parts, fields)
    for name in list(parts):
        if not re.match(r"word/(header|footer)[^/]*\.xml$", name):
            continue
        root = xml(parts[name])
        for paragraph in root.findall(".//w:p", NS):
            nodes = paragraph.findall(".//w:t", NS)
            joined = "".join(node.text or "" for node in nodes)
            replaced = joined
            for key, value in fields.items():
                replaced = replaced.replace("{{" + key + "}}", value)
            if replaced != joined and nodes:
                nodes[0].text = replaced
                for node in nodes[1:]:
                    node.text = ""
        parts[name] = encode(root)
    return parts

# --- Non-interactive LibreOffice execution -------------------------------
def property_value(name, value):
    import uno
    prop = uno.createUnoStruct("com.sun.star.beans.PropertyValue")
    prop.Name, prop.Value = name, value
    return prop


def layout(root):
    import uno
    fields_file = root / "fields.json"
    fields = json.loads(fields_file.read_text()) if fields_file.exists() else {}
    parts = merge_document(root / "input.docx", root / "template.docx", fields)
    merged = root / "merged.docx"
    with zipfile.ZipFile(merged, "w", zipfile.ZIP_DEFLATED) as archive:
        for name, data in parts.items():
            archive.writestr(name, data)
    pipe = "bid_layout_" + str(os.getpid())
    office = subprocess.Popen(["/usr/bin/libreoffice", "-env:UserInstallation=" + (root / "profile").as_uri(), "--headless", "--nologo", "--nodefault", "--nofirststartwizard", "--norestore", "--accept=pipe,name=" + pipe + ";urp;StarOffice.ComponentContext"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    document = None
    try:
        local = uno.getComponentContext()
        resolver = local.ServiceManager.createInstanceWithContext("com.sun.star.bridge.UnoUrlResolver", local)
        context = None
        for _ in range(100):
            try:
                context = resolver.resolve("uno:pipe,name=" + pipe + ";urp;StarOffice.ComponentContext")
                break
            except Exception:
                if office.poll() is not None:
                    raise RuntimeError("Document layout process stopped")
                time.sleep(0.1)
        if context is None:
            raise RuntimeError("Document layout startup timed out")
        desktop = context.ServiceManager.createInstanceWithContext("com.sun.star.frame.Desktop", context)
        document = desktop.loadComponentFromURL(merged.as_uri(), "_blank", 0, tuple(property_value(k, v) for k, v in [("Hidden", True), ("ReadOnly", False), ("MacroExecutionMode", 4), ("UpdateDocMode", 0)]))
        document.CurrentController.ViewSettings.ShowFieldCommands = False
        styles = document.StyleFamilies.getByName("ParagraphStyles")
        for name in styles.ElementNames:
            style = styles.getByName(name)
            for prop, value in [("CharFontName", "Carlito"), ("CharFontNameAsian", "Noto Serif CJK SC")]:
                if style.PropertySetInfo.hasPropertyByName(prop):
                    style.setPropertyValue(prop, value)
            if name in ["Standard", "Normal", "Text body", "Text Body"]:
                spacing = uno.createUnoStruct("com.sun.star.style.LineSpacing")
                spacing.Mode, spacing.Height = 3, 635
                style.ParaLineSpacing = spacing
                style.CharHeight = 11
                style.CharHeightAsian = 11
                style.ParaBottomMargin = 212
        first = document.Text.createEnumeration().nextElement()
        if first.supportsService("com.sun.star.text.Paragraph") and first.String.strip():
            first.CharHeight = 24
            first.CharHeightAsian = 24
            # Wrapped cover lines must scale with their 24 pt type, not body spacing.
            spacing = uno.createUnoStruct("com.sun.star.style.LineSpacing")
            spacing.Mode, spacing.Height = 0, 115
            first.ParaLineSpacing = spacing
            first.ParaAdjust = 3
            first.ParaTopMargin = 5292
            first.ParaBottomMargin = 847
        for name in document.TextTables.ElementNames:
            table = document.TextTables.getByName(name)
            table.RepeatHeadline = True
            table.HeaderRowCount = 1
            for index in range(table.Rows.Count):
                row = table.Rows.getByIndex(index)
                if row.PropertySetInfo.hasPropertyByName("IsSplitAllowed"):
                    row.IsSplitAllowed = False
            for cell_name in table.CellNames:
                cell = table.getCellByName(cell_name)
                cursor = cell.createTextCursor()
                cursor.gotoEnd(True)
                cursor.CharHeight = 10.5
                cursor.CharHeightAsian = 10.5
                cursor.ParaTopMargin = 0
                cursor.ParaBottomMargin = 106
                spacing = uno.createUnoStruct("com.sun.star.style.LineSpacing")
                spacing.Mode, spacing.Height = 0, 100
                cursor.ParaLineSpacing = spacing
        document.refresh()
        for _ in range(2):
            indexes = document.DocumentIndexes
            for index in range(indexes.Count):
                indexes.getByIndex(index).update()
            document.TextFields.refresh()
        document.storeAsURL((root / "output.docx").as_uri(), tuple(property_value(k, v) for k, v in [("FilterName", "Office Open XML Text"), ("Overwrite", True)]))
        document.storeToURL((root / "output.pdf").as_uri(), tuple(property_value(k, v) for k, v in [("FilterName", "writer_pdf_Export"), ("Overwrite", True)]))
        pages = document.CurrentController.PageCount
        (root / "result.json").write_text(json.dumps({"pages": pages, "engine": "LibreOffice Writer"}))
    finally:
        if document is not None:
            document.close(True)
        office.terminate()
        try:
            office.wait(timeout=10)
        except subprocess.TimeoutExpired:
            office.kill()
            office.wait()


if __name__ == "__main__":
    layout(Path(sys.argv[1]).resolve())
