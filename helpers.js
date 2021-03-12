const db = require('./db');
const ExpressError = require('./expressError');	

async function getCompanyOr404(code){
    const company = await db.query(`SELECT code, name, description FROM companies WHERE code = $1`, [code]);

    if (company.rows.length === 0) throw new ExpressError(`Cannot find company with code ${code}.`, 404);
    else return company.rows[0];
} 

async function getInvoiceOr404(id){
    const invoice = await db.query(`SELECT id, comp_code, amt, paid, add_date, paid_date FROM invoices WHERE id = $1`, [id]);
    
    if (invoice.rows.length === 0) throw new ExpressError(`Cannot find invoice with id ${id}.`, 404);
    else return invoice.rows[0];
} 
  


module.exports = { getCompanyOr404, getInvoiceOr404 }