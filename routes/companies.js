const express = require('express');

const db = require('../db');
const ExpressError = require('../expressError');
const { getCompanyOr404 } = require('../helpers');
// const middleware = require('../middleware');

const router = new express.Router();


/*      /companies ROUTES       */

router.get('/', async (req, resp, next) => {
    try {
        const companies = await db.query(`SELECT code, name FROM companies`);

        return resp.json({ 
            companies: companies.rows
        });
    }
    catch(err) {
        return next(err);
    }
});

router.get('/:code', async (req, resp, next) => {
    try {
        const company = await getCompanyOr404(req.params.code);

        return resp.json({
            company: company.rows[0]
        });
    }
    catch(err) {
        return next(err);
    }
});

router.post('/', async (req, resp, next) => {
    try {
        const { code, name } = req.body;
        if (!code || !name) throw new ExpressError(`Please include a company code and company name`, 400);

        const description = req.body.description || null;

        const company = await db.query(`INSERT INTO companies (code, name, description) VALUES ($1, $2, $3) RETURNING code, name, description`, [code, name, description]);

        return resp.status(201).json({ company: company.rows[0]});
    }
    catch(err) {
        return next(err);
    }
});

router.put('/:code', async (req, resp, next) => {
    try {
        const company = await getCompanyOr404(req.params.code);
        
        company.name = req.body.name || company.name;
        company.description = req.body.description || company.description;

        // some of the SQL from this line is from solution code.
        const updatedCompany = await db.query(`UPDATE companies
                                                SET name=$1, description=$2
                                                WHERE code = $3
                                                RETURNING code, name, description`, [company.name, company.description, company.code]);

        return resp.json({ company: updatedCompany.rows[0]});
    }
    catch(err) {
        return next(err);
    }
});

router.delete('/:code', async (req, resp, next) => {
    try {
        const company = await getCompanyOr404(req.params.code);
        
        const deleted = await db.query('DELETE FROM companies WHERE code = $1', [company.code])

        return resp.json({ company: `${company.name} successfully deleted.`});
    }
    catch(err) {
        return next(err);
    }
});



module.exports = router;