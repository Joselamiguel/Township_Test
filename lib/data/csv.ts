/** RFC4180-style CSV parser, including quoted newlines and UTF-8 BOMs. */
export function csvRows(text: string): string[][] {
    const rows: string[][] = [], row: string[] = [];
    let value = '', quoted = false;
    for (let i=0; i<text.length; i++) {
        const c=text[i];
        if (c==='"') { if (quoted && text[i+1]==='"') { value+='"';i++; } else quoted=!quoted; }
        else if (c===',' && !quoted) { row.push(value);value=''; }
        else if ((c==='\n'||c==='\r')&&!quoted) { if(c==='\r'&&text[i+1]==='\n')i++;row.push(value);if(row.some(v=>v!==''))rows.push([...row]);row.length=0;value=''; }
        else value+=c;
    }
    if (quoted) throw new Error('Unterminated CSV value.');
    if (value || row.length) { row.push(value);rows.push(row); }
    if (rows[0]?.[0]) rows[0][0]=rows[0][0].replace(/^\uFEFF/,'');
    return rows;
}
export function csvObjects(text: string): Record<string,string>[] {
    const [headers,...rows]=csvRows(text);
    if (!headers?.length || new Set(headers).size!==headers.length) throw new Error('CSV headers must be present and unique.');
    return rows.map((row,i)=>{
        if(row.length!==headers.length)throw new Error(`CSV row ${i+2} has an unexpected column count.`);
        return Object.fromEntries(headers.map((key,j)=>[key,row[j]]));
    });
}
