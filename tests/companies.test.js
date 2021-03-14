process.env.NODE_ENV === 'test';

const request = require('supertest');

const app = require('../app');
const db = require('../db');

const testCoVals = ['tst', 'test', 'test description'];
const testInvoiceVals = [testCoVals[0], 100];
let testCompany;

beforeEach(async () => {
    const company = await db.query(`INSERT INTO companies VALUES ($1, $2, $3) RETURNING code, name, description`, testCoVals);
    testCompany = company.rows[0];

    const invoice = await db.query(`INSERT INTO invoices (comp_code, amt) VALUES ($1, $2) RETURNING id, comp_code, amt, paid, add_date, paid_date`, testInvoiceVals);
    
    testCompany.invoices = invoice.rows;
});

afterEach(async () => {
    await db.query(`DELETE FROM companies`);

    testCompany = undefined;
});

afterAll(async () => {
    await db.query(`DELETE FROM invoices`);
    await db.end();
});


//      /companies routes tests


describe('GET /companies', () => {
    test('should return array of all companies.', async () => {
        const getCompanies = await request(app).get('/companies');

        expect(getCompanies.statusCode).toBe(200);
        expect(getCompanies.body.companies.length).toBe(1);
        expect(getCompanies.body).toEqual({ 'companies': [{
            'code': testCompany.code,
            'name': testCompany.name
        }]});
    });
});

describe('GET /companies/:code', () => {
    test('should return object with code, name, description.', async () => {
        const getCompany = await request(app).get(`/companies/${testCompany.code}`);
        
        expect(getCompany.statusCode).toBe(200);
        // expect(getCompany.body).toEqual({
        //     'company': testCompany
        // });
    });
    
    test('should throw Error if invalid code.', async () => {
        const nums = -123456789;
        const notFoundNums = await request(app).get(`/companies/${nums}`);
        
        expect(notFoundNums.statusCode).toBe(404);
        expect(notFoundNums.body.error.message).toBe(`Cannot find company with code ${nums}.`);
        
        const notFoundNull = await request(app).get(`/companies/${null}`);

        expect(notFoundNull.statusCode).toBe(404);
        expect(notFoundNull.body.error.message).toBe(`Cannot find company with code null.`);

        const string = 'Voldemort';
        const notFoundString = await request(app).get(`/companies/${string}`);

        expect(notFoundString.statusCode).toBe(404);
        expect(notFoundString.body.error.message).toBe(`Cannot find company with code ${string}.`);
    });
});

describe('POST /companies', () => {
    test('should successfully post a company (with description).', async () => {
        const testCompanyObj = {
            code: 'sprgbrd',
            name: 'Springboard',
            description: 'Bootcamp Excellence'
        };
        const testCompany1 = await request(app).post('/companies').send(testCompanyObj);

        expect(testCompany1.statusCode).toBe(201);
        expect(testCompany1.body).toEqual({ 'company': testCompanyObj });
    });
  
    test('should successfully post a company (without a description).', async () => {
        const testOrchObj = {
            code: 'dpo',
            name: 'Dayton Philharmonic Orchestra',
        };
        const testCompany1 = await request(app).post('/companies').send(testOrchObj);
        
        // the POST route returns the company with a description, even if not included in the request body.
        testOrchObj.description = null;

        expect(testCompany1.statusCode).toBe(201);
        expect(testCompany1.body).toEqual({ 'company': testOrchObj });
    });
    
    test('should throw error if no name provided.', async () => {
        const onlyCode = {
            code: 'code',
        };
        const missingName = await request(app).post('/companies').send(onlyCode);
        
        // the POST route returns the company with a description, even if not included in the request body.
        onlyCode.description = null;

        expect(missingName.statusCode).toBe(400);
        expect(missingName.body.error.message).toBe('Please include a company code and company name.');
    });
    
    test('should throw error if no code provided.', async () => {
        const onlyName = {
            name: 'name',
        };
        const missingCode = await request(app).post('/companies').send(onlyName);
        
        onlyName.description = null;

        expect(missingCode.statusCode).toBe(400);
        expect(missingCode.body.error.message).toBe('Please include a company code and company name.');
    });
    
    test('should throw error if both name and code missing.', async () => {
        const missingNameAndCode = await request(app).post('/companies').send(null);
        
        expect(missingNameAndCode.statusCode).toBe(400);
        expect(missingNameAndCode.body.error.message).toBe('Please include a company code and company name.');
    });
    
});

describe('PUT /companies/:code', () => {
    test('should update company name.', async () => {
        const updateName = {name: 'test_test'}
        const updatedCo = await request(app).put(`/companies/${testCompany.code}`).send(updateName);

        expect(updatedCo.statusCode).toBe(200);
        expect(updatedCo.body.company.code).toBe(testCompany.code);
        expect(updatedCo.body.company.name).toBe(updateName.name);
        expect(updatedCo.body.company.description).toBe(testCompany.description);
    });
    
    test('should update company description.', async () => {
        const updateDescription = {description: 'updated description'}
        const updatedCo = await request(app).put(`/companies/${testCompany.code}`).send(updateDescription);

        expect(updatedCo.statusCode).toBe(200);
        expect(updatedCo.body.company.code).toBe(testCompany.code);
        expect(updatedCo.body.company.name).toBe(testCompany.name);
        expect(updatedCo.body.company.description).toBe(updateDescription.description);
    });
    
    test('should not update company code.', async () => {
        const updateCode = {code: 'tesssst'}
        const updatedCo = await request(app).put(`/companies/${testCompany.code}`).send(updateCode);

        expect(updatedCo.statusCode).toBe(200);
        expect(updatedCo.body.company.code).not.toBe(updateCode.code);
        expect(updatedCo.body.company.code).toBe(testCompany.code);
    });

    test('should throw Error if invalid code.', async () => {
        const nums = -123456789;
        const notFoundNums = await request(app).put(`/companies/${nums}`);
        
        expect(notFoundNums.statusCode).toBe(404);
        expect(notFoundNums.body.error.message).toBe(`Cannot find company with code ${nums}.`);
        
        const notFoundNull = await request(app).put(`/companies/${null}`);

        expect(notFoundNull.statusCode).toBe(404);
        expect(notFoundNull.body.error.message).toBe(`Cannot find company with code null.`);

        const string = 'Voldemort';
        const notFoundString = await request(app).put(`/companies/${string}`);

        expect(notFoundString.statusCode).toBe(404);
        expect(notFoundString.body.error.message).toBe(`Cannot find company with code ${string}.`);
    });
});

describe('DELETE /companies/:code', () => {
    test('should successfully delete a company.', async () => {
        const deleteCo = await request(app).delete(`/companies/${testCompany.code}`);

        expect(deleteCo.statusCode).toBe(200);
        expect(deleteCo.body).toEqual({ status: `${testCompany.name} successfully deleted.`});

        const emptyArr = await request(app).get(`/companies`);
        
        expect(emptyArr.body.companies.length).toBe(0);
    });
    
    test('should throw Error if invalid code.', async () => {
        const nums = -123456789;
        const notFoundNums = await request(app).delete(`/companies/${nums}`);
        
        expect(notFoundNums.statusCode).toBe(404);
        expect(notFoundNums.body.error.message).toBe(`Cannot find company with code ${nums}.`);
        
        const notFoundNull = await request(app).delete(`/companies/${null}`);

        expect(notFoundNull.statusCode).toBe(404);
        expect(notFoundNull.body.error.message).toBe(`Cannot find company with code null.`);

        const string = 'Voldemort';
        const notFoundString = await request(app).delete(`/companies/${string}`);

        expect(notFoundString.statusCode).toBe(404);
        expect(notFoundString.body.error.message).toBe(`Cannot find company with code ${string}.`);
    });
});

