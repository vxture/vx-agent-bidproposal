"""Real-render regression against a fixture from the published document renderer.

@package @bidproposal/app
@layer Infrastructure
@category DocumentLayoutTests
@author AI-Generated
@date 2026-11-25
"""
import importlib.util
import json
from pathlib import Path
import re
import shutil
import sys
import tempfile
import unittest
import zipfile

spec = importlib.util.spec_from_file_location("bid_layout", Path(__file__).with_name("layout.py"))
engine = importlib.util.module_from_spec(spec)
spec.loader.exec_module(engine)
FIXTURE = Path(sys.argv.pop(1)).resolve()
FIELDS = {"projectName": "Synthetic project", "documentName": "Synthetic response", "documentNumber": "TEST-2026"}


# --- Default and template preparation ------------------------------------
class LayoutRegression(unittest.TestCase):
    def test_default_headings_and_page_fields_are_explicit(self):
        parts = engine.merge_document(FIXTURE, FIXTURE.with_name("no-template.docx"), FIELDS)
        document = engine.xml(parts["word/document.xml"])
        levels = document.xpath("//w:pPr/w:outlineLvl/@w:val", namespaces=engine.NS)
        self.assertEqual(levels, ["0", "1", "0", "1"])
        self.assertTrue(document.xpath("//w:sectPr/w:titlePg", namespaces=engine.NS))
        header = engine.xml(parts["word/headerBidDefault.xml"])
        text = "".join(header.xpath("//w:t/text()", namespaces=engine.NS))
        for value in FIELDS.values():
            self.assertIn(value, text)
        footer = engine.xml(parts["word/footerBidDefault.xml"])
        self.assertEqual(footer.xpath("//w:fldSimple/@w:instr", namespaces=engine.NS), ["PAGE", "NUMPAGES"])

    def test_default_header_escapes_xml_data(self):
        fields = {**FIELDS, "projectName": "Project <&> literal"}
        parts = engine.merge_document(FIXTURE, FIXTURE.with_name("no-template.docx"), fields)
        header = engine.xml(parts["word/headerBidDefault.xml"])
        self.assertIn(fields["projectName"], "".join(header.xpath("//w:t/text()", namespaces=engine.NS)))

    def test_template_furniture_is_preserved(self):
        with tempfile.TemporaryDirectory(prefix="bid-layout-template-") as directory:
            template = Path(directory) / "template.docx"
            original = engine.merge_document(FIXTURE, Path(directory) / "absent.docx", {**FIELDS, "projectName": "Template-owned header"})
            self.write(template, original)
            parts = engine.merge_document(FIXTURE, template, FIELDS)
            self.assertEqual(parts["word/headerBidDefault.xml"], original["word/headerBidDefault.xml"])
            self.assertEqual(parts["word/footerBidDefault.xml"], original["word/footerBidDefault.xml"])

    @staticmethod
    def write(path, parts):
        with zipfile.ZipFile(path, "w", zipfile.ZIP_DEFLATED) as archive:
            for name, data in parts.items():
                archive.writestr(name, data)

    # --- Actual non-interactive Writer rendering -------------------------
    def test_actual_default_and_template_toc_have_text_and_real_pages(self):
        for custom in [False, True]:
            with self.subTest(custom_template=custom), tempfile.TemporaryDirectory(prefix="bid-layout-engine-") as directory:
                root = Path(directory)
                shutil.copyfile(FIXTURE, root / "input.docx")
                (root / "fields.json").write_text(json.dumps(FIELDS))
                if custom:
                    template = engine.merge_document(FIXTURE, root / "absent.docx", {**FIELDS, "projectName": "Template-owned header"})
                    self.write(root / "template.docx", template)
                engine.layout(root)
                result = json.loads((root / "result.json").read_text())
                self.assertGreaterEqual(result["pages"], 4)
                self.assertTrue((root / "output.pdf").read_bytes().startswith(b"%PDF-"))
                parts = engine.read_package(root / "output.docx")
                document = engine.xml(parts["word/document.xml"])
                toc = "".join(document.xpath("//w:sdt//w:t/text()", namespaces=engine.NS))
                for heading in ["First chapter", "First section", "Second chapter", "Second section"]:
                    self.assertIn(heading, toc)
                self.assertRegex(toc, r"[3-9]")
                page_fields = " ".join(" ".join(engine.xml(data).xpath("//w:instrText/text() | //w:fldSimple/@w:instr", namespaces=engine.NS)) for name, data in parts.items() if re.fullmatch(r"word/footer[^/]*\.xml", name))
                self.assertRegex(page_fields, r"\bPAGE\b")
                self.assertRegex(page_fields, r"\bNUMPAGES\b")


if __name__ == "__main__":
    unittest.main()
