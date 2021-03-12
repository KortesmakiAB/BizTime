process.env.NODE_ENV === 'test';

const request = require('supertest');
const { all } = require('../app');

const app = require('../app');
const db = require('../db');

const testCoVals = ['tst', 'test', 'test description'];
const testInvoiceVals = [testCoVals[0], 100];
let testCompany;
let testInvoice;

beforeAll(async () =>{
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

    test('should get test invoice id, amt, paid, add_date, paid_date, company {} (but not comp_code).', async () => {
        const testInv = await request(app).get(`/invoices/${testInvoice.id}`);
        const comp = await db.query(`SELECT code, name, description FROM companies WHERE code = $1`, [testInvoice.comp_code     ]);

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
    
});

// describe('GET /invoices/:id', () => {
//     beforeAfterEach();

//     test('should ', async () => {
        
//     });
    
// });

