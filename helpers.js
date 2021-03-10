const db = require('./db');

async function getCompanyOr404(code){
    const company = await db.query(`SELECT code, name, description FROM companies WHERE code = $1`, [code]);

    if (company.rows.length === 0) throw new ExpressError(`Cannot find company with code ${code}`, 404);
    else return company.rows[0];
} 
  





module.exports = { getCompanyOr404 }