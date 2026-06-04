const fs = require('fs');

const SOURCE_URL = "https://raw.githubusercontent.com/Dimonovich/TV/refs/heads/Dimonovich/FREE/TV";
const OUTPUT_FILE = "tvfromspb.m3u";

// Маркер канала Еда в вашем личном плейлисте
const TARGET_MARKER = '#EXTINF:-1 tvg-id="eda" tvg-logo="https://epg.pw/media/images/epg/2024/06/08/20240608032929595611_57.png" group-title="Развлекательное",Еда';

async function main() {
    try {
        // 1. Скачиваем донорский плейлист
        const response = await fetch(SOURCE_URL);
        if (!response.ok) throw new Error(`Ошибка загрузки донора: ${response.status}`);
        const donorText = await response.text();
        const donorLines = donorText.split(/\r?\n/);

        let donorUA = null;
        let donorURL = null;

        // 2. Ищем поток Еды у донора
        for (let i = 0; i < donorLines.length; i++) {
            const line = donorLines[i].trim();
            if (line.startsWith("https") && line.toLowerCase().includes("/streaming/eda/")) {
                // ОБЯЗАТЕЛЬНОЕ УДАЛЕНИЕ "tracks-v5a1/"
                donorURL = line.replace("tracks-v5a1/", "");

                // Проверяем User-Agent строкой выше
                if (i > 0 && donorLines[i - 1].trim().startsWith("#EXTVLCOPT")) {
                    donorUA = donorLines[i - 1].trim();
                }
                break;
            }
        }

        if (!donorURL) {
            console.log("Поток телеканала Еда у донора не найден.");
            return;
        }

        console.log(`Найдена и очищена ссылка донора: ${donorURL}`);

        // 3. Читаем ваш личный плейлист
        if (!fs.existsSync(OUTPUT_FILE)) {
            console.log(`Ошибка: Файл ${OUTPUT_FILE} не найден!`);
            return;
        }
        const myPlaylistText = fs.readFileSync(OUTPUT_FILE, 'utf-8');
        const myLines = myPlaylistText.split(/\r?\n/);

        const newLines = [];
        let updated = false;

        // 4. Точечно заменяем ссылку в вашем плейлисте
        for (let i = 0; i < myLines.length; i++) {
            const currentLine = myLines[i].trim();
            newLines.push(myLines[i]); // Оставляем саму строку #EXTINF

            if (currentLine === TARGET_MARKER) {
                // Пропускаем старый User-Agent и старую ссылку, которые идут следом
                let skipIndex = i + 1;
                while (skipIndex < myLines.length) {
                    const nextLine = myLines[skipIndex].trim();
                    if (nextLine.startsWith("#EXTVLCOPT") || nextLine.startsWith("http")) {
                        skipIndex++;
                    } else {
                        break;
                    }
                }

                // Вставляем новые очищенные данные
                if (donorUA) newLines.push(donorUA);
                newLines.push(donorURL);

                i = skipIndex - 1; // Сдвигаем указатель чтения оригинального файла
                updated = true;
            }
        }

        // 5. Перезаписываем файл, если нашли маркер
        if (updated) {
            fs.writeFileSync(OUTPUT_FILE, newLines.join('\n') + '\n', 'utf-8');
            console.log("Ваш плейлист успешно обновлен через JS!");
        } else {
            console.log("Маркер канала 'Еда' не найден в вашем файле.");
        }

    } catch (error) {
        console.error("Произошла ошибка:", error.message);
    }
}

main();
