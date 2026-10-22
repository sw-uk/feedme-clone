# 클립보드 API가 없는 환경에서 긴 본문 열기가 아무 반응 없이 실패한다

**Symptom**: 본문이 길어 클립보드 방식으로 넘어가는 경우, `navigator.clipboard`가 없는 환경에서 "ChatGPT·Claude로 열기"를 누르면 새 대화창도 열리지 않고 오류 토스트도 뜨지 않는다.

**Observed evidence**: `features/url-to-markdown/converter.tsx`의 `openIn`이 `navigator.clipboard.writeText(message)`를 `try` 밖에서 호출한다. localhost와 https에서는 정상 동작함을 확인했고, http로 서비스되는 사내 주소 같은 비보안 컨텍스트에서는 재현하지 않았다(코드 읽기 기반).

**Suspected cause**: 비보안 컨텍스트에서는 `navigator.clipboard`가 `undefined`라서 `writeText` 호출이 동기 예외(TypeError)를 던지고, 그 뒤의 `window.open`과 `try/catch`에 닿기 전에 함수가 끝난다. (추정, 미확인)

**What was tried**: 코드 리뷰(low)에서 지적되어 기록만 했다. 평소 경로(localhost, https)에서는 재현되지 않아 이번 범위에서는 고치지 않았다.

**Proposed next step**: `http://<LAN 주소>:3000`처럼 비보안 컨텍스트로 접속해 재현하고, 재현되면 `navigator.clipboard?.writeText`를 `try` 안으로 옮겨 실패 시 오류 토스트를 보이게 한다.
