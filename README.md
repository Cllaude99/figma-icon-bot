# Figma Icon Bot

Figma의 아이콘을 자동으로 동기화하여 GitHub 저장소에 반영하는 자동화 도구입니다.

## 모듈 설명

**Figma Icon Bot**은 개발자가 디자이너의 Figma 아이콘 작업을 자동으로 동기화하기 위한 NPM 패키지입니다. 디자이너가 Figma에서 아이콘을 수정하거나 추가하면, 개발자가 설정한 자동화를 통해 GitHub에 Pull Request가 생성됩니다.

### 해결하는 문제

- **수동 작업 제거**: 디자이너가 아이콘을 수정할 때마다 개발자가 수동으로 Export 버튼을 눌러 다운로드하는 번거로움 해소
- **변경사항 추적**: 어떤 아이콘이 추가/수정/삭제되었는지 자동으로 추적하고 Git PR로 제공
- **자동화된 워크플로우**: GitHub Actions와 연동하여 매일 자동으로 Figma에서 아이콘을 동기화

### 주요 기능

- **Figma API 연동**: Personal Access Token으로 Figma 파일에 접근하여 Component 자동 감지
- **다양한 출력 형식**: SVG 파일 또는 React 컴포넌트(TypeScript/JavaScript) 형식으로 변환
- **SVG 최적화**: SVGO를 사용한 자동 최적화
- **Git 자동화**: 브랜치 생성, 커밋, PR 생성까지 완전 자동화
- **변경 감지**: 추가/수정/삭제된 아이콘을 자동으로 감지
- **GitHub Actions 지원**: CI/CD 파이프라인에 통합 가능

---

## 사용 방법

### 1. 설치

#### 옵션 1: 프로젝트별 설치 (권장)

프로젝트의 `package.json`에 포함되어 팀원들과 동일한 버전을 사용할 수 있습니다.

```bash
# npm
npm install --save-dev figma-icon-bot

# yarn
yarn add --dev figma-icon-bot

# pnpm
pnpm add --save-dev figma-icon-bot
```

설치 후 실행 방법:

```bash
# npx 사용
npx figma-icon-bot init
npx figma-icon-bot sync

# 또는 package.json scripts에 추가
# "scripts": {
#   "icons:sync": "figma-icon-bot sync"
# }
npm run icons:sync
```

#### 옵션 2: 전역 설치

여러 프로젝트에서 사용하거나 CLI로 직접 실행하고 싶은 경우:

```bash
# npm
npm install -g figma-icon-bot

# yarn
yarn global add figma-icon-bot

# pnpm
pnpm add -g figma-icon-bot
```

설치 후 실행 방법:

```bash
figma-icon-bot init
figma-icon-bot sync
```

**요구사항**: Node.js 18 이상, Git 설치, Figma 계정

---

### 2. Figma 준비

#### 2-1. 디자이너로부터 받아야 할 정보

디자이너에게 다음 정보를 요청하세요:

1. **Figma 파일 URL**
2. **Node ID** (아이콘이 모여있는 Frame의 ID)

> 디자이너가 아이콘을 제공하는 방법은 아래 2-3에 자세히 설명되어 있습니다.

#### 2-2. Personal Access Token 발급 (개발자가 직접)

**개발자 본인의 Figma 계정**에서 토큰을 발급받으세요:

1. https://www.figma.com/settings 접속
2. **Personal Access Tokens** 섹션으로 이동
3. **Generate new token** 클릭
4. 토큰 이름 입력 (예: "Icon Sync Bot")
5. **Scopes 설정**:
   - **File content** - Read only 권한 필요 (아이콘 읽기용)
6. 생성된 토큰 복사 (한 번만 표시됩니다)

> **중요**: Figma 파일을 읽기만 하고 수정하지 않기 때문에 **File content - Read only** 권한만 있으면 됩니다. 단, 개발자가 디자이너의 Figma 파일에 접근 권한(View 이상)이 있어야 합니다.

디자이너로부터 받은 Figma URL에서 File Key와 Node ID를 추출합니다:

```
https://www.figma.com/design/Sz3hf6u2abGRj70UBd8RsB/MyDesign?node-id=86-3004
                          ^^^^^^^^^^^^^^^^^^^^^^              ^^^^^^^^
                                File Key                       Node ID (선택)
```

- **File Key**: 필수 - Figma 파일 고유 식별자
- **Node ID**: 선택 - 특정 Frame/섹션만 동기화하려는 경우

> 디자인 파일 전체가 아닌 **아이콘이 모여있는 특정 Frame의 Node ID**를 지정하면 해당 영역의 Component만 추출합니다.

#### 2-4. 디자이너가 Figma에서 아이콘 제공하는 방법

**디자이너가 지켜야 하는 규칙**

### ✅ 필수 규칙

#### 1. 아이콘은 반드시 **Component**로 만들기

#### 2. 하나의 Frame에 모든 아이콘 모아두기 (권장)

- **하나의 Frame 안에 여러 개의 Component를 모아두세요**
- Frame 이름 예시: `Icons`, `Icon Library`, `Design System/Icons` 등
- 이 Frame의 Node ID를 개발자에게 전달하면 됩니다

#### 3. Component 이름 자유롭게 지정

- 디자이너가 원하는 대로 이름을 지정하세요
- 예시: `Home`, `Home Icon`, `icon-home`, `IconHome` 모두 가능
- 개발자가 설정으로 원하는 형식으로 변환할 수 있습니다

### 📋 디자이너가 제공해야 하는 정보

개발자에게 다음 정보를 전달하세요:

1. **Figma 파일 URL** (또는 File Key + Node ID)

   ```
   https://www.figma.com/design/Sz3hf6u2abGRj70UBd8RsB/MyDesign?node-id=86-3004
   ```

2. **Node ID 추출 방법**

   - Figma에서 아이콘이 모여있는 Frame 선택
   - 우클릭 → "Copy/Paste as" → "Copy link"
   - URL에서 `node-id=86-3004` 부분이 Node ID입니다
   - 이 Node ID를 개발자에게 전달하세요

> **참고**: Personal Access Token은 개발자가 본인 계정에서 직접 발급합니다 (위 2-2 참조). 디자이너는 Figma 파일 URL과 Node ID만 제공하면 됩니다.

### 📐 Figma 구조 예시

#### ✅ 올바른 구조

```
📁 Design File
  └─ 📁 Page 1
      └─ 📁 Icons (Frame) ← 이 Frame의 Node ID를 개발자에게 전달
          ├─ 🔷 Home (Component) ✅
          ├─ 🔷 Search (Component) ✅
          ├─ 🔷 Settings (Component) ✅
          ├─ 📁 Social Icons (Frame) ← 중첩된 Frame도 OK
          │   ├─ 🔷 Facebook (Component) ✅
          │   └─ 🔷 Twitter (Component) ✅
          └─ 🔷 User (Component) ✅
```

**결과**: Home, Search, Settings, Facebook, Twitter, User 총 6개 아이콘이 추출됩니다.

#### ❌ 잘못된 구조

```
📁 Design File
  └─ 📁 Page 1
      └─ 📁 Icons (Frame)
          ├─ 🔲 Home (Frame) ❌ Component가 아니라 Frame
          ├─ 📁 Search (Group) ❌ Component가 아니라 Group
          └─ 🔷 Settings (Component) ✅ OK
```

**결과**: Settings 1개만 추출됩니다.

### 🔄 디자이너 워크플로우

1. **초기 설정** (1회만):

   - Frame 생성: "Icons"
   - Figma 파일 URL과 Frame의 Node ID를 개발자에게 전달
   - 개발자가 Figma 파일에 접근 권한(View 이상)이 있는지 확인

2. **일상적인 작업**:

   - "Icons" Frame 안에 새 아이콘 디자인
   - Component로 변환 (`Ctrl/Cmd + Alt + K`)
   - Component 이름 지정
   - 저장
   - 끝! (나머지는 자동화됨)

3. **자동 동기화**:
   - 개발자가 설정한 시간(예: 매일 오전 10시)에 자동으로 GitHub에 PR 생성
   - 또는 개발자가 수동으로 실행

> **핵심**: 디자이너는 Frame 안에 Component만 만들어두면 됩니다. 나머지는 자동화가 처리합니다!

---

### 3. 프로젝트 초기화

#### 3-1. 환경 변수 설정

```bash
export FIGMA_ACCESS_TOKEN="figd_xxxxxxxxxxxxx"
```

또는 `.env` 파일 생성:

```bash
echo "FIGMA_ACCESS_TOKEN=figd_xxxxxxxxxxxxx" > .env
```

#### 3-2. 설정 파일 생성

```bash
figma-icon-bot init
```

`.figma-icon-bot.config.json` 파일이 생성됩니다.

#### 3-3. 설정 파일 수정

```json
{
  "figma": {
    "fileKey": "Sz3hf6u2abGRj70UBd8RsB",
    "nodeId": "86-3004"
  },
  "output": {
    "directory": "./icons",
    "formats": ["svg", "react"],
    "react": {
      "typescript": true,
      "exportType": "named",
      "componentPrefix": "Icon"
    }
  },
  "naming": {
    "transform": "kebab-case",
    "sanitize": true
  },
  "git": {
    "enabled": true,
    "branch": "chore/sync-figma-icons",
    "commitMessage": "chore: sync Figma icons",
    "createPR": true,
    "prTitle": "🎨 Sync Figma Icons"
  }
}
```

**주요 설정 옵션**:

- `figma.fileKey`: Figma 파일 키 (필수)
- `figma.nodeId`: 아이콘이 있는 특정 Frame의 Node ID (선택, 권장)
- `output.directory`: 아이콘 저장 디렉토리
- `output.formats`: 출력 형식 (`["svg"]`, `["react"]`, `["svg", "react"]`)
- `output.react.typescript`: TypeScript 사용 여부 (true: `.tsx`, false: `.jsx`)
- `output.react.exportType`: Export 방식 (`named` 또는 `default`)
- `output.react.componentPrefix`: React 컴포넌트 이름 접두사 (예: "Icon" → IconHome, IconSearch)
- `naming.transform`: 파일명 변환 방식 (아래 참조)
- `naming.sanitize`: 파일 시스템에 안전하지 않은 문자 제거 여부 (기본: true)
- `git.enabled`: Git 자동화 활성화 여부
- `git.createPR`: PR 자동 생성 여부

**naming.transform 옵션**:

| 옵션           | 설명                               | 예시 (Figma: "Home Icon") |
| -------------- | ---------------------------------- | ------------------------- |
| `"preserve"`   | 디자이너가 설정한 이름 그대로 유지 | `Home Icon.svg`           |
| `"kebab-case"` | 소문자 + 하이픈                    | `home-icon.svg`           |
| `"camelCase"`  | 카멜 케이스                        | `homeIcon.svg`            |
| `"PascalCase"` | 파스칼 케이스                      | `HomeIcon.svg`            |

> **권장**: `"preserve"`를 사용하여 디자이너의 의도를 존중하거나, `"kebab-case"`를 사용하여 일관된 파일명 규칙을 적용하세요.

---

### 4. 연결 테스트

```bash
figma-icon-bot validate
```

성공 시:

```
✓ Configuration valid
✓ Connected to Figma file: MyDesign
✓ Found 24 potential icon(s)
```

---

### 5. 아이콘 동기화 실행

#### 로컬에서 실행 (Git 없이)

```bash
figma-icon-bot sync --no-git
```

#### Git 자동화 포함

```bash
figma-icon-bot sync
```

이 명령은 다음을 수행합니다:

1. Figma API로 아이콘 다운로드
2. SVG 최적화
3. React 컴포넌트 생성 (설정된 경우)
4. 변경사항 감지 (추가/수정/삭제)
5. Git 브랜치 생성 및 커밋
6. GitHub PR 생성

---

### 6. GitHub Actions 자동화 (선택)

매일 자동으로 Figma 아이콘을 동기화하려면 GitHub Actions를 설정하세요.

#### 6-1. GitHub Secrets 추가

1. GitHub 저장소 → **Settings** → **Secrets and variables** → **Actions**
2. **New repository secret** 클릭
3. 추가:
   - Name: `FIGMA_ACCESS_TOKEN`
   - Value: (Figma에서 발급받은 토큰)

#### 6-2. Workflow 파일 생성

`.github/workflows/sync-icons.yml`:

```yaml
name: Sync Figma Icons

on:
  schedule:
    - cron: '0 10 * * *' # 매일 오전 10시(UTC) 실행
  workflow_dispatch: # 수동 실행 가능

jobs:
  sync-icons:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install figma-icon-bot
        run: npm install -g figma-icon-bot

      - name: Sync icons from Figma
        env:
          FIGMA_ACCESS_TOKEN: ${{ secrets.FIGMA_ACCESS_TOKEN }}
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: figma-icon-bot sync
```

#### 6-3. 커밋 & 푸시

```bash
git add .figma-icon-bot.config.json .github/workflows/sync-icons.yml
git commit -m "feat: add Figma icon sync automation"
git push
```

#### 6-4. 수동 실행 테스트

1. GitHub → **Actions** 탭
2. **Sync Figma Icons** 선택
3. **Run workflow** 클릭

---

### 7. CLI 명령어

#### `init` - 설정 파일 생성

```bash
figma-icon-bot init
```

#### `sync` - 아이콘 동기화

```bash
# 기본 실행
figma-icon-bot sync

# Git 자동화 비활성화
figma-icon-bot sync --no-git

# PR 생성 건너뛰기 (커밋만)
figma-icon-bot sync --no-pr
```

#### `validate` - 설정 및 연결 확인

```bash
figma-icon-bot validate
```

---

### 8. 프로그래밍 방식으로 사용

#### 기본 사용

```typescript
import { syncIcons, loadConfig } from 'figma-icon-bot';

async function sync() {
  const config = await loadConfig();
  const result = await syncIcons(config);

  console.log(`Added: ${result.added.length}`);
  console.log(`Updated: ${result.updated.length}`);
  console.log(`Deleted: ${result.deleted.length}`);
}

sync();
```

#### 커스텀 설정

```typescript
import { syncIcons } from 'figma-icon-bot';

const customConfig = {
  figma: {
    fileKey: 'YOUR_FILE_KEY',
    nodeId: '86-3004', // Optional: target specific frame
    accessToken: process.env.FIGMA_ACCESS_TOKEN!,
  },
  output: {
    directory: './custom-icons',
    formats: ['svg' as const, 'react' as const],
    react: {
      typescript: true,
      exportType: 'named' as const,
      componentPrefix: 'Icon',
    },
  },
  naming: {
    transform: 'camelCase' as const, // 'preserve' | 'kebab-case' | 'camelCase' | 'PascalCase'
    sanitize: true,
  },
  git: {
    enabled: false,
    createPR: false,
  },
};

const result = await syncIcons(customConfig);
```

#### 빌드 프로세스에 통합

```json
{
  "scripts": {
    "prebuild": "figma-icon-bot sync --no-git",
    "build": "vite build"
  }
}
```

---

### 9. 출력 결과

#### 예시 1: SVG 출력 (kebab-case)

**Figma Component 이름**: `Home Icon`, `Search Icon`, `Settings Icon`

설정:

```json
{
  "output": {
    "formats": ["svg"]
  },
  "naming": {
    "transform": "kebab-case"
  }
}
```

결과:

```
icons/
├── home-icon.svg
├── search-icon.svg
└── settings-icon.svg
```

#### 예시 2: React 컴포넌트 출력 (preserve)

**Figma Component 이름**: `HomeIcon`, `SearchIcon`, `SettingsIcon`

설정:

```json
{
  "output": {
    "formats": ["react"],
    "react": {
      "typescript": true,
      "exportType": "named",
      "componentPrefix": "Icon"
    }
  },
  "naming": {
    "transform": "preserve"
  }
}
```

결과:

```
icons/
├── IconHomeIcon.tsx
├── IconSearchIcon.tsx
└── IconSettingsIcon.tsx
```

생성된 컴포넌트:

```tsx
// IconHomeIcon.tsx
import React from 'react';

export function IconHomeIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" {...props}>
      <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
    </svg>
  );
}
```

사용 예시:

```tsx
import { IconHomeIcon } from './icons/IconHomeIcon';

<IconHomeIcon className="w-6 h-6 text-blue-500" />;
```

#### 예시 3: 디자이너 이름 그대로 유지

**Figma Component 이름**: `Home`, `Search`, `Settings`

설정:

```json
{
  "naming": {
    "transform": "preserve",
    "sanitize": true
  }
}
```

결과: `Home.svg`, `Search.svg`, `Settings.svg`

---

### 10. 문제 해결

#### "FIGMA_ACCESS_TOKEN is required"

환경 변수를 설정하세요:

```bash
export FIGMA_ACCESS_TOKEN="figd_xxxxx"
```

#### "No icons found in Figma"

1. Figma에서 아이콘이 **Component**로 만들어졌는지 확인
2. `nodeId`를 제거하고 전체 파일에서 검색
3. 설정의 `filters.includePattern` 확인

#### "Failed to create PR"

GitHub Token이 필요합니다:

1. https://github.com/settings/tokens 에서 토큰 생성
2. `repo`, `workflow` 권한 선택
3. 환경 변수로 설정:

```bash
export GITHUB_TOKEN="ghp_xxxxx"
```

---

## 라이선스

MIT License

---

## 링크

- **NPM**: https://www.npmjs.com/package/figma-icon-bot
- **GitHub**: https://github.com/Cllaude99/figma-icon-bot
- **Issues**: https://github.com/Cllaude99/figma-icon-bot/issues
