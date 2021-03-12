const express = require('express');

const db = require('../db');
const ExpressError = require('../expressError');
const { getInvoiceOr404, getCompanyOr404 } = require('../helpers');

const router = new express.Router();


//      /invoices ROUTES

router.get('/', async (req, resp, next) => {
    try {
        const invoices = await db.query(`SELECT id, comp_code, amt FROM invoices`);

        return resp.json({ invoices: invoices.rows });
    }
    catch(err) {
        return next(err);
    }
});

router.get('/:id', async (req, resp, next) => {
    try {
        const invoice = await getInvoiceOr404(req.params.id);
        const company = await getCompanyOr404(invoice.comp_code);

        // using the long version, so as not to include comp_code.
        return resp.json({ invoice: {
                                id: invoice.id, 
                                amt: invoice.amt, 
                                paid: invoice.paid, 
                                add_date: invoice.add_date, 
                                paid_date: invoice.paid_date,
                                company }          
        });
    }
    catch(err) {
        return next(err);
    }
});

router.post('/', async (req, resp, next) => {
    try {
        const {comp_code, amt} = req.body;
        if (!comp_code || !amt) throw new ExpressError(`Please include a company code and invoice amount.`, 400);
        else if (amt < 0) throw new ExpressError(`Please include an invoice amount greater than 0.`, 400);

        const invoice = await db.query(`INSERT INTO invoices (comp_code, amt) VALUES ($1, $2) RETURNING id, comp_code, amt, paid, add_date, paid_date`, [comp_code, amt]);

        return resp.status(201).json({ invoice : invoice.rows[0]});
    }
    catch(err) {
        return next(err);
    }
});

router.put('/:id', async (req, resp, next) => {
    try {
        if (!req.body.amt) throw new ExpressError(`Please include an updated invoice amount.`, 400);
        else if (req.body.amt < 0) throw new ExpressError(`Please include an updated invoice amount greater than 0.`, 400);

        const amt = req.body.amt;

        const invoice = await getInvoiceOr404(req.params.id);
        invoice.amt = amt;
        

        // some of the SQL from this line is from solution code.
        const updatedInvoice = await db.query(`UPDATE invoices
                                                SET amt = $1
                                                WHERE id = $2
                                                RETURNING id, comp_code, amt, paid, add_date, paid_date`, [amt, req.params.id]
        );

        return resp.json({ invoice: updatedInvoice.rows[0]});
    }
    catch(err) {
        return next(err);
    }
});

router.delete('/:id', async (req, resp, next) => {
    try {
        const invoice = await getInvoiceOr404(req.params.id);

        const deleted = await db.query(`DELETE from invoices WHERE id = $1 RETURNING id`, [invoice.id]);

        return resp.json({ status: `Invoice with id ${deleted.rows[0].id} successfully deleted.`});
    } 
    catch (err) {
        return next(err);
    }
});

module.exports = router;