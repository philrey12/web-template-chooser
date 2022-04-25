const express = require('express')
const app = express()
const cors = require('cors')
const rateLimit = require('express-rate-limit')
const PORT = process.env.PORT || 5000
const path = require('path')
const fetch = require('node-fetch')
const apiCache = require('apicache')
const redis = require('redis')
require('dotenv').config()

// RATE LIMITING
const limiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 mins
    max: 100,
    message: 'You have exceeded the 25 requests in 10 minutes limit! Please try again later.',
    headers: true
})
app.use(limiter)
app.set('trust proxy', 1)

// ENABLE CORS
app.use(cors())

app.use(express.urlencoded({ extended: false }))

app.use(express.static(path.join(__dirname, 'public')))

app.set('view engine', 'ejs')
app.set('views', path.join(__dirname, 'views'))

// ENV VARIABLES
const API_BASE_URL = process.env.API_BASE_URL
const API_USERNAME = process.env.API_USERNAME
const API_PASSWORD = process.env.API_PASSWORD
const SUBSCRIPTION_URL = process.env.SUBSCRIPTION_URL
const ZOHO_REFRESH_TOKEN = process.env.ZOHO_REFRESH_TOKEN
const ZOHO_CLIENT_ID = process.env.ZOHO_CLIENT_ID
const ZOHO_CLIENT_SECRET = process.env.ZOHO_CLIENT_SECRET
const ZOHO_TOKEN_BASE_URL = process.env.ZOHO_TOKEN_BASE_URL
const REDIS_BASE_URL = process.env.REDIS_BASE_URL
const REDIS_PORT = process.env.REDIS_PORT
const REDIS_USERNAME = process.env.REDIS_USERNAME
const REDIS_PASSWORD = process.env.REDIS_PASSWORD

const jsonData = require('./data/templates.json');

let cache = apiCache.middleware

let accessToken = ''

app.get('/', cache('2 minutes'), async (req, res) => {
    // GET TOKEN VALUE AND LOAD WEB TEMPLATES
    const client = redis.createClient({
        url: `redis://${REDIS_USERNAME}:${REDIS_PASSWORD}@${REDIS_BASE_URL}:${REDIS_PORT}`
    })
    
    client.on('error', (err) => console.log('Redis Client Error', err))
    
    await client.connect()
    
    const tokenValue = await client.get('key')

    accessToken = tokenValue
    console.log(`Access token: ${accessToken}`)

    res.render('home', {
        data: jsonData
    })
})

app.get('/checkout', async (req, res) => {
    res.send('Oops, you must select a template first.')
})

app.post('/checkout', async (req, res) => {
    let templateIdValue = req.body.templateid
    let companyNameValue = req.body.companyname
    let emailValue = req.body.email
    let firstNameValue = req.body.firstname
    let lastNameValue = req.body.lastname
    let domainPrefix = 'diy_' + companyNameValue.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    let siteName = ''

    async function createSiteAndAccount() {
        // CREATE NEW SITE -----------------------------------------------------------------
        console.log('Duda: Creating new website...')

        const siteOptions = {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                Authorization: 'Basic ' + Buffer.from(`${API_USERNAME}:${API_PASSWORD}`, 'binary').toString('base64')
            },
            body: JSON.stringify({
                site_data: { site_business_info: { business_name: `${companyNameValue}`, email: `${emailValue}` } },
                default_domain_prefix: `${domainPrefix}`,
                template_id: `${templateIdValue}`,
                lang: 'en'
            })
        }

        await fetch(`${API_BASE_URL}/sites/multiscreen/create`, siteOptions)
            .then(res => res.json())
            .then(data => siteName = data.site_name)
            .catch(err => console.error(err))

        // CREATE NEW ACCOUNT -----------------------------------------------------------------
        console.log('Duda: Creating new account...')

        const accountOptions = {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                Authorization: 'Basic ' + Buffer.from(`${API_USERNAME}:${API_PASSWORD}`, 'binary').toString('base64')
            },
            body: JSON.stringify({
                account_type: 'CUSTOMER',
                account_name: `${emailValue}`,
                first_name: `${firstNameValue}`,
                last_name: `${lastNameValue}`,
                lang: 'en',
                email: `${emailValue}`
            })
        }

        await fetch(`${API_BASE_URL}/accounts/create`, accountOptions)
            .then(res => res.text())
            .catch(err => console.error(err))

        // GRANT ACCESS -----------------------------------------------------------------
        console.log('Duda: Granting access to new user...')

        const accessOptions = {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                Authorization: 'Basic ' + Buffer.from(`${API_USERNAME}:${API_PASSWORD}`, 'binary').toString('base64')
            },
            body: JSON.stringify({
                permissions: ['PUSH_NOTIFICATIONS', 'REPUBLISH', 'EDIT', 'INSITE', 'PUBLISH', 'CUSTOM_DOMAIN', 'RESET', 'SEO', 'STATS_TAB', 'BLOG']
            })
        }

        await fetch(`${API_BASE_URL}/accounts/${emailValue}/sites/${siteName}/permissions`, accessOptions)
            .then(res => res.text())
            .catch(err => console.error(err))

        // RENDER PAGE -----------------------------------------------------------------
        // res.render('checkout', {
        //     dataSiteName: siteName,
        //     dataAccountName: emailValue
        // })

        // REDIRECT PAGE -----------------------------------------------------------------
        console.log('Redirecting to Checkout page...')

        res.redirect(`${SUBSCRIPTION_URL}`)
    }

    async function addUserToCRMLead() {
        // ADD NEW LEAD -----------------------------------------------------------------
        console.log('ZCRM: Adding new user to CRM Leads...')

        let tagName = 'DIY Website Builder'
        let params = {
            "data": [
                {
                    "Company": `${companyNameValue}`,
                    "Email": `${emailValue}`,
                    "First_Name": `${firstNameValue}`,
                    "Last_Name": `${lastNameValue}`,
                    "Tag": [
                        {
                            "name": `${tagName}`
                        }
                    ]
                }
            ],
            "trigger": [
                "approval",
                "workflow",
                "blueprint"
            ]
        }

        const addLeadOptions = {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                Authorization: 'Zoho-oauthtoken ' + accessToken
            },
            body: JSON.stringify(params)
        }

        await fetch(`https://www.zohoapis.com/crm/v2/leads/upsert`, addLeadOptions)
            .then(res => res.json())
            .then(data => {
                if (data.status == 'error') {
                    console.log('Invalid access token.')
                    refreshToken()
                } else {
                    createSiteAndAccount()
                }
            })
            .catch(err => console.error(err))
    }

    async function saveToken(tempToken) {
        const client = redis.createClient({
            url: `redis://${REDIS_USERNAME}:${REDIS_PASSWORD}@${REDIS_BASE_URL}:${REDIS_PORT}`
        })
      
        client.on('error', (err) => console.log('Redis Client Error', err))
      
        await client.connect()
      
        await client.set('key', `${tempToken}`)
        const tokenValue = await client.get('key')

        accessToken = tokenValue
        console.log('Access token saved.')
    }

    async function refreshToken() {
        // CREATE NEW ACCESS TOKEN -----------------------------------------------------------------
        console.log('ZCRM: Creating new access token...')

        const refreshTokenOptions = {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                refresh_token: `${ZOHO_REFRESH_TOKEN}`,
                client_id: `${ZOHO_CLIENT_ID}`,
                client_secret: `${ZOHO_CLIENT_SECRET}`,
                grant_type: 'refresh_token'
            }).toString()
        }

        await fetch(`${ZOHO_TOKEN_BASE_URL}`, refreshTokenOptions)
            .then(res => res.json())
            .then(data => {
                accessToken = data.access_token
            })
            .catch(err => console.error(err))

        saveToken(accessToken)
        checkToken()
    }

    async function checkToken() {
        // CHECK ACCESS TOKEN -----------------------------------------------------------------
        console.log('ZCRM: Checking...')

        const checkTokenOptions = {
            method: 'GET',
            headers: {
                Accept: 'application/json',
                Authorization: 'Zoho-oauthtoken ' + accessToken
            }
        }

        await fetch('https://www.zohoapis.com/crm/v2/leads', checkTokenOptions)
            .then(res => res.json())
            .then(data => {
                if (data.status == 'error') {
                    console.log('Invalid access token.')
                    refreshToken()
                } else {
                    console.log('Valid access token.')
                    addUserToCRMLead()
                }
            })
            .catch(err => console.error(err))
    }

    checkToken()
    // createSiteAndAccount()
})

app.listen(PORT, () => console.log(`Server running on port ${PORT}`))
