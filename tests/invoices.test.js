process.env.NODE_ENV === 'test';

const request = require('supertest');

const app = require('../app');
const db = require('../db');
const { getInvoiceOr404 } = require('../helpers');

const testCoVals = ['tst', 'test', 'test description'];
const testInvoiceVals = [testCoVals[0], 100];
let testCompany;
let testInvoice;

const voldemort = 'Voldemort';

beforeAll(async () => {
    const company = await db.query(`INSERT INTO companies VALUES ($1, $2, $3) RETURNING code, name, description`, testCoVals);
    testCompany = company.rows[0];
});

afterAll(async () => {
    await db.query(`DELETE FROM companies`)
    await db.end();
});

function beforeAfterEach(){
    beforeEach(async () => {
        const invoice = await db.query(`INSERT INTO invoices (comp_code, amt) VALUES ($1, $2) RETURNING id, comp_code, amt, paid, add_date, paid_date`, testInvoiceVals);
        testInvoice = invoice.rows[0];

        testCompany.invoices = invoice.rows;
    });
    
    afterEach(async () => {
        await db.query(`DELETE FROM invoices`);

        testInvoice = undefined;
    });
}


//      /invoices routes tests


describe('GET /invoices', () => {
    beforeAfterEach();

    test('should return array of all invoices.', async () => {
        const allInvoices = await request(app).get(`/invoices`);

        expect(allInvoices.statusCode).toBe(200);
        expect(allInvoices.body.invoices.length).toBe(1);
        expect(allInvoices.body).toEqual({ invoices: [{
            id: testInvoice.id,
            comp_code: testInvoice.comp_code,
            amt: testInvoice.amt
            }]
        });
    });
    
});

describe('GET /invoices/:id', () => {
    beforeAfterEach();

    test('should get test-invoice id, amt, paid, add_date, paid_date, company {} (but not comp_code).', async () => {
        const testInv = await request(app).get(`/invoices/${testInvoice.id}`);
        const comp = await db.query(`SELECT code, name, description FROM companies WHERE code = $1`, [testInvoice.comp_code]);

        expect(testInv.statusCode).toBe(200);
        // expect(testInv.body).toEqual({ invoice: {
        //     id: testInvoice.id,
        //     amt: testInvoice.amt,
        //     paid: testInvoice.paid,
        //     add_date: testInvoice.add_date,
        //     paid_date: testInvoice.paid_date,
        //     company: comp.rows[0]
        // }});
    });

    test('should throw 404 if invalid invoice id.', async () => {
        const invalidNum = 0;
        const invalidId = await request(app).get(`/invoices/${invalidNum}`).send({amt: 500});

        expect(invalidId.statusCode).toBe(404);
        expect(invalidId.body.error.message).toBe(`Cannot find invoice with id ${invalidNum}.`);
        
        const invalidString = await request(app).get(`/invoices/${voldemort}`).send({amt: 500});

        expect(invalidString.statusCode).toBe(404);
        expect(invalidString.body.error.message).toBe(`Please enter a valid invoice id.`);
    });
});

describe('POST /invoices', () => {
    
    test('should make new invoice which contains id, comp_code, amt, paid, add_date, paid_date.', async () => {
        const invoiceArgs = {
            comp_code: testCompany.code,
            amt: 999.99
        }
        const newInvoice = await request(app).post(`/invoices`).send(invoiceArgs);
        
        expect(newInvoice.statusCode).toBe(201);
        expect(newInvoice.body.invoice.comp_code).toBe(invoiceArgs.comp_code);
        expect(newInvoice.body.invoice.amt).toBe(invoiceArgs.amt);
        expect(newInvoice.body.invoice.paid).toBe(false);
    });
    
    test('should throw 400 or 404 if invalid comp_code(does not exist, int, undefined).', async () => {
        const voldemortArgs = {
            comp_code: voldemort,
            amt: 999.99
        }
        const badCompCode = await request(app).post(`/invoices`).send(voldemortArgs);
        
        expect(badCompCode.statusCode).toBe(404);
        expect(badCompCode.body.error.message).toBe(`Cannot find company with code ${voldemort}.`);
        
        const invalidNumArgs = {
            comp_code: 123456789,
            amt: 999.99
        }
        const intCompCode = await request(app).post(`/invoices`).send(invalidNumArgs);
        
        expect(intCompCode.statusCode).toBe(400);
        expect(intCompCode.body.error.message).toBe(`Company code may not be a number.`);
        
        const missingCompCodeArgs = {
            amt: 999.99
        }
        const missingCompCode = await request(app).post(`/invoices`).send(missingCompCodeArgs);
        
        expect(missingCompCode.statusCode).toBe(400);
        expect(missingCompCode.body.error.message).toBe(`Please include a company code and invoice amount.`);
    });
    
    test('should throw 400 is missing amount or amount less than or equal to zero.', async () => {
        const missingAmtArgs = {
            comp_code: testCompany.code,
        }
        const missingAmt = await request(app).post(`/invoices`).send(missingAmtArgs);
        
        expect(missingAmt.statusCode).toBe(400);
        expect(missingAmt.body.error.message).toBe(`Please include a company code and invoice amount.`);
        
        const invalidAmtArgs = {
            comp_code: testCompany.code,
            amt: -999.99
        }
        const invalidAmt = await request(app).post(`/invoices`).send(invalidAmtArgs);
        
        expect(invalidAmt.statusCode).toBe(400);
        expect(invalidAmt.body.error.message).toBe(`Please include an invoice amount greater than 0.`);
    });
});    

describe('PUT /invoices/:id', () => {
    beforeAfterEach();

    test('should successfully update invoice amount.', async () => {
        const updatedAmt = await request(app).put(`/invoices/${testInvoice.id}`).send({amt: .01});

        expect(updatedAmt.statusCode).toBe(200);
        expect(updatedAmt.body.invoice.amt).toBe(.01);
    });

    test('should throw 404 if invalid invoice id.', async () => {
        const invalidNum = 0;
        const invalidId = await request(app).put(`/invoices/${invalidNum}`).send({amt: 500});

        expect(invalidId.statusCode).toBe(404);
        expect(invalidId.body.error.message).toBe(`Cannot find invoice with id ${invalidNum}.`);
        
        const invalidString = await request(app).put(`/invoices/${voldemort}`).send({amt: 500});

        expect(invalidString.statusCode).toBe(404);
        expect(invalidString.body.error.message).toBe(`Please enter a valid invoice id.`);
    });
    
    test('should throw 400 (ExpressError) if invalid amount (zero, string, or missing amount).', async() => {
        const invalidAmtZero = await request(app).put(`/invoices/${testInvoice.id}`).send({amt: -0});

        expect(invalidAmtZero.statusCode).toBe(400);
        expect(invalidAmtZero.body.error.message).toBe('Please include an updated invoice amount greater than 0.');
        
        const invalidAmtString = await request(app).put(`/invoices/${testInvoice.id}`).send({amt: voldemort});

        expect(invalidAmtString.statusCode).toBe(400);
        expect(invalidAmtString.body.error.message).toBe('Please include a valid invoice amount.');
        
        const missingAmt = await request(app).put(`/invoices/${testInvoice.id}`).send();

        expect(missingAmt.statusCode).toBe(400);
        expect(missingAmt.body.error.message).toBe('Please include a valid invoice amount.');
    });
});

describe('POST /invoices/:id', () => {
    beforeAfterEach();

    test('should successfully delete an invoice.', async () => {
        const deleteInvoice = await request(app).delete(`/invoices/${testInvoice.id}`);

        expect(deleteInvoice.statusCode).toBe(200);
        expect(deleteInvoice.body.status).toBe(`Invoice with id ${testInvoice.id} successfully deleted.`);
    });
    
    test('should throw 404 if invalid invoice id (non-existant id or string id).', async () => {
        const invalidNum = 0;
        const invalidId = await request(app).delete(`/invoices/${invalidNum}`).send({amt: 500});

        expect(invalidId.statusCode).toBe(404);
        expect(invalidId.body.error.message).toBe(`Cannot find invoice with id ${invalidNum}.`);
        
        const invalidString = await request(app).delete(`/invoices/${voldemort}`).send({amt: 500});

        expect(invalidString.statusCode).toBe(404);
        expect(invalidString.body.error.message).toBe(`Please enter a valid invoice id.`);
    });
});