from dataclasses import dataclass
from io import BytesIO
from pathlib import Path
from zipfile import is_zipfile

import pdfplumber
from docx import Document
from docx.document import Document as DocumentObject
from docx.oxml.table import CT_Tbl
from docx.oxml.text.paragraph import CT_P
from docx.table import Table
from docx.text.paragraph import Paragraph
from werkzeug.datastructures import FileStorage
from werkzeug.utils import secure_filename

MAX_RESUME_FILE_SIZE = 20 * 1024 * 1024
MAX_RESUMES_PER_REQUEST = 10

ALLOWED_RESUME_TYPES = {
    ".pdf": {"application/pdf"},
    ".docx": {
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    },
}


class ResumeFileError(ValueError):
    """A safe, user-facing resume validation or extraction error."""


@dataclass(frozen=True)
class ValidatedResume:
    original_filename: str
    safe_filename: str
    extension: str
    mime_type: str
    content: bytes


def validate_resume_file(file: FileStorage) -> ValidatedResume:
    original_filename = (file.filename or "").strip()
    if not original_filename:
        raise ResumeFileError("The uploaded file does not have a filename.")

    safe_filename = secure_filename(original_filename)
    if not safe_filename:
        safe_filename = "resume"

    extension = Path(safe_filename).suffix.lower()
    if extension not in ALLOWED_RESUME_TYPES:
        raise ResumeFileError("Only PDF and DOCX files are supported.")

    mime_type = (file.mimetype or "").lower()
    if mime_type not in ALLOWED_RESUME_TYPES[extension]:
        raise ResumeFileError(
            f"The file MIME type is not valid for a {extension[1:].upper()} file."
        )

    file.stream.seek(0)
    content = file.stream.read(MAX_RESUME_FILE_SIZE + 1)
    file.stream.seek(0)

    if not content:
        raise ResumeFileError("The uploaded file is empty.")
    if len(content) > MAX_RESUME_FILE_SIZE:
        raise ResumeFileError("The file exceeds the 20 MB size limit.")

    if extension == ".pdf" and not content.startswith(b"%PDF-"):
        raise ResumeFileError("The uploaded PDF has an invalid file signature.")
    if extension == ".docx" and not is_zipfile(BytesIO(content)):
        raise ResumeFileError("The uploaded DOCX has an invalid file signature.")

    return ValidatedResume(
        original_filename=original_filename,
        safe_filename=safe_filename,
        extension=extension,
        mime_type=mime_type,
        content=content,
    )


def extract_resume_text(resume: ValidatedResume) -> str:
    if resume.extension == ".pdf":
        return _extract_pdf_text(resume.content)
    if resume.extension == ".docx":
        return _extract_docx_text(resume.content)
    raise ResumeFileError("The resume format is not supported.")


def _extract_pdf_text(content: bytes) -> str:
    try:
        with pdfplumber.open(BytesIO(content)) as document:
            pages = [(page.extract_text() or "").strip() for page in document.pages]
    except Exception as exc:
        raise ResumeFileError("The PDF is corrupted or could not be parsed.") from exc

    text = "\n\n".join(page for page in pages if page).strip()
    if not text:
        raise ResumeFileError(
            "The PDF contains no extractable text. Scanned PDFs require OCR, "
            "which is not enabled."
        )
    return text


def _iter_docx_blocks(document: DocumentObject):
    for child in document.element.body.iterchildren():
        if isinstance(child, CT_P):
            yield Paragraph(child, document)
        elif isinstance(child, CT_Tbl):
            yield Table(child, document)


def _extract_docx_text(content: bytes) -> str:
    try:
        document = Document(BytesIO(content))
        blocks = []

        for block in _iter_docx_blocks(document):
            if isinstance(block, Paragraph):
                text = block.text.strip()
                if text:
                    blocks.append(text)
                continue

            for row in block.rows:
                values = [cell.text.strip() for cell in row.cells if cell.text.strip()]
                if values:
                    blocks.append(" | ".join(values))
    except Exception as exc:
        raise ResumeFileError("The DOCX is corrupted or could not be parsed.") from exc

    text = "\n".join(blocks).strip()
    if not text:
        raise ResumeFileError("The DOCX contains no extractable text.")
    return text
