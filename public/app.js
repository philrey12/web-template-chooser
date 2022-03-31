const modalTitle = document.getElementById('modal-title')
const modalId = document.getElementById('template-id-value')
const modalImage = document.getElementById('desktop-thumbnail')
const modalBtnProceed = document.getElementById('btn-proceed')
const modalBtnLoading = document.getElementById('btn-loading')

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

const loadingSpinner = () => {
    modalBtnProceed.classList.add('d-none')
    modalBtnLoading.classList.remove('d-none')
}

if (modalBtnProceed) {
    modalBtnProceed.addEventListener('click', loadingSpinner)
}
