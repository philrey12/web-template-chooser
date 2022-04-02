const modalTitle = document.getElementById('modal-title')
const modalId = document.getElementById('template-id-value')
const modalImage = document.getElementById('desktop-thumbnail')
const modalBtnProceed = document.getElementById('btn-proceed')
const modalBtnLoading = document.getElementById('btn-loading')
const modalCompanyName = document.forms['modal-form']['companyname'].value
const modalEmail = document.forms['modal-form']['email'].value
const modalFirstName = document.forms['modal-form']['firstname'].value
const modalLastName = document.forms['modal-form']['lastname'].value

let templateName = ''
let templateId = ''
let thumbnailUrl = ''

const getTemplateInfo = (name, id, thumbnail_url) => {
    templateName = name
    templateId = id
    thumbnailUrl = thumbnail_url
    modalTitle.innerHTML = templateName
    modalId.value = templateId
    modalImage.innerHTML = `<center><img src="${thumbnailUrl}" width="30%"></center>`
}

const checkFields = () => {
    modalBtnProceed.classList.add('d-none')
    modalBtnLoading.classList.remove('d-none')

    if (modalCompanyName == null && modalEmail == null && modalFirstName == null && modalLastName == null) {
        modalBtnProceed.classList.remove('d-none')
        modalBtnLoading.classList.add('d-none')
    }
}
