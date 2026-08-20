document.addEventListener('DOMContentLoaded', function () {
    const cards = document.querySelectorAll('.subject-card');

    function computeCard(card) {
        const mse = parseFloat(card.querySelector('.mse-input').value) || 0;
        const ese = parseFloat(card.querySelector('.ese-input').value) || 0;
        const scaledMse = (mse / 50) * 30;
        const scaledEse = (ese / 100) * 70;
        const total = scaledMse + scaledEse;

        const liveTotal = card.querySelector('.live-total');
        if (liveTotal) {
            liveTotal.textContent = 'Weighted total: ' + total.toFixed(2) + ' / 100';
        }
        return total;
    }

    function updateGrandTotal() {
        let sum = 0;
        cards.forEach(card => { sum += computeCard(card); });
        const grand = document.getElementById('grandTotalPreview');
        if (grand) {
            const max = cards.length * 100;
            const pct = cards.length ? (sum / cards.length) : 0;
            grand.textContent = 'Overall (live): ' + sum.toFixed(2) + ' / ' + max + '  (' + pct.toFixed(2) + '%)';
        }
    }

    cards.forEach(card => {
        card.querySelectorAll('input[type="number"]').forEach(inp => {
            inp.addEventListener('input', updateGrandTotal);
        });
    });

    updateGrandTotal();
});
