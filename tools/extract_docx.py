"""Extract text (paragraphs + tables, in document order) from the agile dev spec DOCX."""
import sys
import docx
from docx.document import Document as _Document
from docx.oxml.ns import qn
from docx.table import Table
from docx.text.paragraph import Paragraph


def iter_block_items(parent):
    if isinstance(parent, _Document):
        parent_elm = parent.element.body
    else:
        parent_elm = parent._tc
    for child in parent_elm.iterchildren():
        if child.tag == qn('w:p'):
            yield Paragraph(child, parent)
        elif child.tag == qn('w:tbl'):
            yield Table(child, parent)


def cell_text(cell):
    parts = []
    for p in cell.paragraphs:
        t = p.text.strip()
        if t:
            parts.append(t)
    return ' / '.join(parts)


def main(path, out):
    d = docx.Document(path)
    lines = []
    idx = 0
    for block in iter_block_items(d):
        if isinstance(block, Paragraph):
            txt = block.text.strip()
            if not txt:
                continue
            style = block.style.name if block.style is not None else ''
            idx += 1
            if style.startswith('Heading') or style in ('Title', 'Subtitle'):
                lines.append(f"\n[P{idx}|{style}] {txt}")
            else:
                lines.append(f"[P{idx}] {txt}")
        else:
            rows = []
            for row in block.rows:
                cells = [cell_text(c) for c in row.cells]
                rows.append(' | '.join(cells))
            idx += 1
            lines.append(f"\n[T{idx}|TABLE {len(block.rows)}x{len(block.columns)}]")
            lines.extend(rows)
            lines.append(f"[T{idx}|END]")
    with open(out, 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines))
    print('written', out, len(lines), 'lines')


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
