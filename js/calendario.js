const calendarDates = document.getElementById('calendarDates');
        const monthSelect = document.getElementById('month-select');
        const yearSelect = document.getElementById('year-select');

        const currentDate = new Date();
        let currentMonth = currentDate.getMonth();
        let currentYear = currentDate.getFullYear();

        const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
            'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

        function populateMonthYearSelects() {
            monthSelect.innerHTML = '';
            yearSelect.innerHTML = '';

            monthNames.forEach((month, index) => {
                const opt = document.createElement('option');
                opt.value = index;
                opt.textContent = month;
                if (index === currentMonth) opt.selected = true;
                monthSelect.appendChild(opt);
            });

            for (let y = 2000; y <= 2030; y++) {
                const opt = document.createElement('option');
                opt.value = y;
                opt.textContent = y;
                if (y === currentYear) opt.selected = true;
                yearSelect.appendChild(opt);
            }
        }

        function renderCalendar(month, year) {
            const firstDay = new Date(year, month, 1).getDay();
            const lastDate = new Date(year, month + 1, 0).getDate();

            calendarDates.innerHTML = '';

            for (let i = 0; i < firstDay; i++) {
                calendarDates.innerHTML += `<div class="empty"></div>`;
            }

            for (let i = 1; i <= lastDate; i++) {
                const today = new Date();
                const isToday = i === today.getDate() &&
                    month === today.getMonth() &&
                    year === today.getFullYear();

                calendarDates.innerHTML += `<div class="date ${isToday ? 'today' : ''}">${i}</div>`;
            }

            // atualiza os selects
            monthSelect.value = month;
            yearSelect.value = year;
        }

        function prevMonth() {
            currentMonth--;
            if (currentMonth < 0) {
                currentMonth = 11;
                currentYear--;
            }
            renderCalendar(currentMonth, currentYear);
        }

        function nextMonth() {
            currentMonth++;
            if (currentMonth > 11) {
                currentMonth = 0;
                currentYear++;
            }
            renderCalendar(currentMonth, currentYear);
        }

        function onMonthChange() {
            currentMonth = parseInt(monthSelect.value);
            renderCalendar(currentMonth, currentYear);
        }

        function onYearChange() {
            currentYear = parseInt(yearSelect.value);
            renderCalendar(currentMonth, currentYear);
        }

        populateMonthYearSelects();
        renderCalendar(currentMonth, currentYear);