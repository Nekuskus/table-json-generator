/* Autor: Nekuskus */

let tables = document.getElementsByTagName('table')

function getChildren(element) {
    let children = Array.from(element.children).map(el => getElement(el))
    return children
}

function getElement(element) {
    let ret = { tagName: element.tagName, id: element.id, className: element.className, style: element.style.cssText, innerText: element.innerText, colSpan: element.colSpan, span: element.span }
    if (element.children.length > 0) ret.children = getChildren(element)
    return ret
}
if (tables.length !== 0) {
    let promptString = 'Wybierz element <table> z listy, aby został wyświetlony jako JSON w konsoli, oraz w alercie:\n' + Array.from(tables).map((val, idx) => {
        return `${idx}: <${val.tagName} id="${val.id}" class=${val.className}>`
    }).join('\n')
    var index = prompt(promptString)
} else {
    console.error('W tym dokumencie nie ma żadnych tabeli.')
    var index = null
}





/* Ten program opiera się na standardzie HTML5: */
/* https://www.w3.org/TR/2011/WD-html5-20110405/tabular-data.html#the-table-element */

/* Zawartość tabeli według: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/table (Permitted content) */
/* każdy z powyższych elementów może zawierać tylko: 
- (caption) dowolna treść html (flow content)
- (colgroup) zero lub więcej elementów COL
- (thead, tbody, tfoot) zero lub więcej elementów TR*/


function parseTable(table) {
    let res = { caption: '', colgroups: [], headers: [], tbody_table: [], rows: [], footer: [] }

    function processTBody(tbody) {
        let headers = []
        let rows = []
        tbody.children.filter(el => el.tagName === 'TR').forEach((row, row_idx) => {
            if (headers.length === 0 && row.children.filter(el => el.tagName === 'TH' || el.tagName === "TD").every(el => el.tagName === 'TH' || el.innerText === "")) {
                colspan_offset = 0
                row.children.forEach((el, idx) => {
                    if (el.innerText !== "") {
                        if (res.headers[0] != undefined) headers.push({ column: res.headers[0][idx + colspan_offset].value, value: el.innerText, colSpan: el.colSpan })
                        else headers.push({value: el.innerText, colSpan: el.colSpan })
                    }
                    colspan_offset += el.colSpan - 1
                })
            } else {
                rows.push(processRow(row))
            }
        })
        return { headers: headers, rows: rows }
    }

    function processRow(row) {
        let temp_row = { headers: [], data: [] }
        colspan_offset = 0
        row.children.filter(child => child.tagName === 'TH' || child.tagName === 'TD').forEach((child, idx) => {
            if (child.tagName === 'TH') {
                if (res.headers[0] != undefined && res.headers[0][idx + colspan_offset]) temp_row.headers.push({ column: res.headers[0][idx + colspan_offset].value, value: child.innerText, colSpan: child.colSpan })
                else temp_row.headers.push({ value: child.innerText, colSpan: child.colSpan })
            }
            else if (child.tagName === 'TD') {
                if (res.headers[0] != undefined && res.headers[0][idx + colspan_offset]) temp_row.data.push({ column: res.headers[0][idx + colspan_offset].value, value: child.innerText, colSpan: child.colSpan })
                else temp_row.data.push({ value: child.innerText, colSpan: child.colSpan })
            }
            colspan_offset += child.colSpan - 1
        })
        return temp_row
    }

    let caption = table.children.find(el => el.tagName === 'CAPTION')
    let colgroup = table.children.filter(el => el.tagName === 'COLGROUP')
    let thead = table.children.find(el => el.tagName === 'THEAD')
    let tbody_table = table.children.filter(el => el.tagName === 'TBODY')
    let trs = table.children.filter(el => el.tagName === 'TR')
    let tfoot = table.children.find(el => el.tagName === 'TFOOT')

    if (caption) {
        res.caption = caption.innerHTML
    }

    if (colgroup.length) {
        res.colgroups = colgroup.map(el => {
            return {
                span: el.span, cols: el.children.filter(e => e.tagName === 'COL').map(e => {
                    return { span: e.span }
                })
            }
        })
    }

    // Ustala headery na podstawie <thead>
    if (thead) {
        thead.children.filter(el => el.tagName === 'TR').forEach(child => {
            let temp_row = []
            child.children.forEach(el => {
                if (el.tagName === 'TH' || el.tagName == 'TD') {
                    temp_row.push({ value: el.innerText, colSpan: el.colSpan })
                }
            })
            res.headers.push(temp_row)
        })
    }

    // Jeśli wciąż nie ma headerów, bierze pierwszy rząd w którym są same <th>, jeżeli jest tylko jedno TBody, lub nie ma TBody
    if (res.headers.length === 0) {
        if (tbody_table.length === 1) {
            let found_index = -1
            tbody_table[0].children.filter(e => e.tagName === 'TR').forEach((row, idx) => {
                if (res.headers.length === 0 && row.children.every(child => child.tagName === 'TH')) {
                    row.children.forEach(child => {
                        res.headers.push([{ value: child.innerText, colSpan: child.colSpan }])
                    })
                    found_index = idx
                }
            })
            if (found_index > -1) {
                tbody_table[0].children.splice(found_index, 1)
            }
        } else if (tbody_table.length === 0) {
            let found_index = -1
            trs.forEach((row, idx) => {
                if (res.headers.length === 0 && row.children.every(child => child.tagName === 'TH')) {
                    row.children.forEach(child => {
                        res.headers.push([{ value: child.innerText, colSpan: child.colSpan }])
                    })
                    found_index = idx
                }
            })
            if (found_index > -1) {
                trs.splice(found_index, 1)
            }
        }
    }

    if (tbody_table.length)
        res.tbody_table = tbody_table.map(tbody => {
            return processTBody(tbody)
        })

    if (trs.length) {
        res.rows = trs.map(tr => processRow(tr))
    }

    if (tfoot) {
        res.footer = processTBody(tfoot)
    }

    return res
}

if (index !== null && index.trim().match(/^\d+$/) && parseInt(index) < tables.length) {
    let obj = {}
    let table = tables[index]

    // Konwertuje wszystkie HTMLCollection na Array poprzez Array.from(), aby potem nie konwertować manualnie przy korzystaniu z Array.prototype
    obj = getElement(tables[parseInt(index)])

    let res = parseTable(obj)

    console.log(JSON.stringify(res))
    alert(JSON.stringify(res))
} else {
    if (index === null) console.error('Skrypt anulowany')
    else console.error('Podano niewłaściwy indeks')
}
