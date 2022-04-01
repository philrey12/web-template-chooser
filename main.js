const express = require('express')
const app = express()
const cors = require('cors')
const PORT = process.env.PORT || 5000
const path = require('path')
const fetch = require('node-fetch')
require('dotenv').config()

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

const jsonData = require('./data/templates.json');

app.get('/', async (req, res) => {
    res.render('home', {
        data: jsonData
    })
})

app.get('/checkout', async (req, res) => {
    res.send('Oops! Please select a template.')
})

app.post('/checkout', async (req, res) => {
    let templateIdValue = req.body.templateid
    let companyNameValue = req.body.companyname
    let emailValue = req.body.email
    let firstNameValue = req.body.firstname
    let lastNameValue = req.body.lastname
    let domainPrefix = 'diy_' + companyNameValue.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    let siteName = ''
    // let resetPasswordLink = ''

    async function createSite() {
        // SITE -----------------------------------------------------------------
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

        // ACCOUNT -----------------------------------------------------------------
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

        // FEATURE ACCESS -----------------------------------------------------------------
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

        // RESET PASSWORD LINK -----------------------------------------------------------------
        // const passwordResetOptions = {
        //     method: 'POST',
        //     headers: {
        //         Accept: 'application/json',
        //         Authorization: 'Basic ' + Buffer.from(`${API_USERNAME}:${API_PASSWORD}`, 'binary').toString('base64')
        //     }
        // }

        // await fetch(`${API_BASE_URL}/accounts/reset-password/${emailValue}`, passwordResetOptions)
        //     .then(res => res.json())
        //     .then(data => resetPasswordLink = data.reset_url)
        //     .catch(err => console.error(err))

        // RENDER PAGE -----------------------------------------------------------------
        res.render('checkout', {
            dataSiteName: siteName,
            dataAccountName: emailValue
        })
    }

    createSite()
})

app.listen(PORT, () => console.log(`Server running on port ${PORT}`))
