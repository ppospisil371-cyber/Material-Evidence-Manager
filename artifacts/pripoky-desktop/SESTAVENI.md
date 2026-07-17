# Sestavení desktopové aplikace (.exe)

## Co je potřeba

- Windows 10/11 (64-bit)
- [Node.js 20 LTS](https://nodejs.org/) nebo novější
- [pnpm](https://pnpm.io/installation): `npm install -g pnpm`
- [Git](https://git-scm.com/)
- Visual Studio Build Tools (pro kompilaci `better-sqlite3`):
  - Stáhněte z: https://visualstudio.microsoft.com/visual-cpp-build-tools/
  - Zaškrtněte: **Desktop development with C++**

## Sestavení krok za krokem

### 1. Stáhněte projekt

Stáhněte projekt z Replit (tlačítko ··· → Download as zip) a rozbalte.

### 2. Nainstalujte závislosti

```bash
pnpm install
```

### 3. Sestavte sdílené knihovny

```bash
pnpm run typecheck:libs
```

### 4. Sestavte React aplikaci (frontend)

```bash
pnpm --filter @workspace/pripoky-app run build
```

### 5. Zkopírujte frontend do složky desktop aplikace

```bash
mkdir -p artifacts/pripoky-desktop/renderer
xcopy /E /I artifacts\pripoky-app\dist artifacts\pripoky-desktop\renderer
```

### 6. Přestavte nativní moduly pro Electron

```bash
cd artifacts/pripoky-desktop
npx electron-rebuild -f -w better-sqlite3
```

### 7. Sestavte hlavní proces Electron

```bash
node build.mjs
```

### 8. Vytvořte instalátor (.exe)

```bash
npx electron-builder --win --x64
```

Instalátor se vytvoří v `artifacts/pripoky-desktop/release/`.

---

## Automatické sestavení přes GitHub Actions

Pokud máte projekt na GitHubu, `.exe` se sestaví automaticky:

1. Přejděte na GitHub → váš repozitář → **Actions**
2. Vlevo vyberte **Build Desktop App (.exe)**
3. Klikněte **Run workflow**
4. Po dokončení stáhněte `.exe` z **Artifacts**

---

## Kde jsou data uložena

Aplikace ukládá data do:
```
C:\Users\<jméno>\AppData\Roaming\Evidence přípojek\evidence-pripojek.sqlite
```

Data jsou **oddělená** od webové verze — každá verze má vlastní databázi.
