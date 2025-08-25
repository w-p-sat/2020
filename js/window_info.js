// Знаходимо елементи на сторінці за їх класами та ідентифікаторами
const moreInfoBtn = document.querySelector('.more_info');
const modal = document.getElementById('moreInfoModal');
const closeBtn = document.querySelector('.close-button');

// Функція для відкриття модального вікна
function openModal() {
    modal.style.display = 'block';
}

// Функція для закриття модального вікна
function closeModal() {
    modal.style.display = 'none';
}

// Додаємо обробник події для кнопки "Більше інформації"
moreInfoBtn.addEventListener('click', openModal);

// Додаємо обробник події для кнопки закриття
closeBtn.addEventListener('click', closeModal);

// Закриваємо вікно, якщо клікнули за його межами
window.addEventListener('click', (event) => {
    if (event.target === modal) {
        closeModal();
    }
});