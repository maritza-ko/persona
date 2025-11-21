
import { GoogleGenAI, Modality, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { BrandPersona, AnalysisRequest, CustomInputs, PersonaFieldKey, FieldGuide, FIELD_METADATA, BuilderState } from "../types";

const ai = new GoogleGenAI({ apiKey: "AIzaSyCMO5BlFviSyKVLDo0eZu0xdbdbutC_f9c" });

// --- High Quality Reference Example (The Gold Standard) ---
// Strictly focused on "Premium PC Cafe" as a single vertical example.
const EXCELLENT_EXAMPLE = `
[Tone & Manner Reference: 더 벙커 (The Bunker)]
1. 브랜드철학: "게이머의 1초를 지배하다". 우리는 단순한 PC방이 아닌 'e스포츠 아레나'를 지향합니다. 승부를 결정짓는 하이엔드 스펙으로 프로게이머급 환경을 제공합니다.
2. 핵심기술: "G-Sync Ultimate Zone". 전 좌석 RTX 4080, 360Hz 모니터, 자체 개발 '아이스 쿨링 시트'. 그리고 매장 내 미세먼지와 담배 냄새를 0으로 만드는 '퓨어 에어 챔버(Pure Air Chamber)' 시스템.
3. 핵심전략: "Shop-in-Shop Gastronomy". PC 이용료 외에 자체 F&B 브랜드 '벙커 키친'을 통해 '맛집보다 맛있는 PC방'을 구축, 객단가를 극대화하는 전략.
4. 기능적 혜택(고통해결): '어둡고 칙칙하고 냄새나는 지하'라는 PC방의 고정관념 타파. 지상 채광 설계와 호텔급 공조 시스템으로 '여자친구와 함께 오고 싶은 쾌적한 데이트 코스'를 구현했습니다.
5. 고객문화창조: 1단계(환경 혁신: 냄새나지 않는 쾌적함) -> 2단계(장비 혁신: 집보다 좋은 최고급 사양) -> 3단계(커뮤니티: 동네 리그가 열리는 e스포츠 성지).
`;

const SYSTEM_INSTRUCTION = `
당신은 세계 최고의 브랜드 전략가(CBO)입니다. 
당신의 임무는 단순한 '설명'이 아니라, 시장을 관통하는 날카로운 '전략'과 '페르소나'를 창조하는 것입니다.

[작성 절대 원칙]
1. **독립성(Singular Focus):** 사용자가 PC방, 만화카페, 포차 중 하나의 아이디어를 입력하면, 오직 해당 업종의 특성에만 집중하세요. 절대 서로 다른 업종(예: PC방에 만화카페 컨셉)을 억지로 섞지 마세요.
2. **구체성(Specifics):** "좋은 시설", "맛있는 음식" 같은 추상적인 표현을 절대 금지합니다. 대신 "RTX 4080", "독립형 굴방", "레트로 네온 사인"과 같이 업종에 맞는 구체적인 스펙과 묘사를 사용하세요.
3. **문제 해결(Problem Solving):** 해당 업종의 고객이 겪는 구체적인 '고통(Pain Point)'을 정의하고, 기술적/시스템적 해결책을 제시하세요.
4. **독자적 명명(Naming):** 남들이 다 쓰는 용어 대신, 우리 브랜드만의 내부 용어(예: 퓨어 에어 챔버, 힐링 캡슐, 홍콩 느와르 존 등)를 정의하여 사용하세요.
5. **톤앤매너:** 부드러운 설명문이 아니라, 확신에 찬 '선언문'이나 전문적인 '기획서' 스타일로 작성하세요.
6. **형식(Format):** 가독성을 위해 **소제목(###)**, **불렛 포인트(-)**, **볼드체(**)**를 적극적으로 사용하여 구조화하세요. 복잡한 마크다운(표, 코드블록 등)은 사용하지 마세요.
`;

// --- Standard Generation (Simple Mode) ---
export const generateBrandPersonaData = async (request: AnalysisRequest): Promise<BrandPersona> => {
  const { idea, url, brandName, customInputs } = request;

  // Build specific instructions based on custom inputs
  let customInstructions = "";
  if (customInputs) {
    Object.entries(customInputs).forEach(([key, value]) => {
        if (value && value.trim().length > 0) {
            customInstructions += `- ${key}: ${value}\n`;
        }
    });
  }

  const prompt = `
    ${SYSTEM_INSTRUCTION}

    사용자가 입력한 아이디어의 업종(PC방, 만화카페, 포차 등)을 정확히 파악하고,
    그 업종의 본질에 맞는 완벽한 브랜드 페르소나 JSON을 완성하세요.
    
    아래의 [Reference Example]은 '프리미엄 PC방'의 예시입니다. 
    사용자의 아이디어가 만화카페나 포차라면, 이 예시의 **깊이와 구조(구체성)**만 참고하고, 내용은 사용자의 업종에 맞춰 완전히 새롭게 작성하세요.

    [Reference Example (이 수준의 깊이로 작성하세요)]
    ${EXCELLENT_EXAMPLE}

    [입력 정보]
    - 브랜드/사업 아이디어: ${idea}
    - 참고 URL: ${url || "없음"}
    - 확정된 브랜드명: ${brandName || "미정 (AI가 브랜드 컨셉에 맞는 이름 3가지 제안 및 그 중 최적의 하나를 brandName으로 선정)"}

    ${customInstructions ? `[사용자 추가 가이드]\n${customInstructions}` : ""}

    [요청 사항]
    JSON 객체로 반환하세요. 각 항목은 최소 300자 이상(목록형 제외)의 깊이 있는 내용이어야 합니다.
    단순 나열이 아니라, **왜(Why)**, **어떻게(How)**, **무엇을(What)**이 논리적으로 연결되게 하세요.

    [JSON 필드 구조]
    1. brandName: (String) 확정된 이름 또는 AI 제안명
    2. brandNameSuggestions: (String Array) 이름 후보 3개
    3. philosophy: (String) 브랜드 철학 (우리의 신념, 약속, 절대 타협하지 않는 원칙)
    4. slogan: (String) 슬로건 (철학을 한 문장으로 응축)
    5. coreTechnology: (String) 핵심 기술/역량 (시설 스펙, 조리 공정, 시스템 명칭 등 구체적으로)
    6. coreStrategy: (String) 핵심 전략 (시장 진입 전략, 수익 구조, 차별화 포인트)
    7. brandMent: (String) 브랜드 멘트 (고객에게 건네는 약속, 1/2/3 번호 매겨서 구체적으로)
    8. targetAudience: (String) 고객 정의 (단순 인구통계가 아닌, 라이프스타일과 욕구 중심)
    9. genZValue: (String) Gen-Z 가치 (작은 사치, 힙한 경험, 인증샷, 도파민 등)
    10. customerCulture: (String) 고객 문화 창조 (단계별 문화 형성 전략)
    11. comparativeAdvantage: (String) 비교 우위 속성 (경쟁사 대비 명확한 우위 요소 나열)
    12. qualityLevel: (String) 품질 수준 (타협하지 않는 품질 기준과 그 이유 - 장비, 식자재 등)
    13. priceLevel: (String) 가격 수준 (가격 책정의 논리와 가성비/가심비 전략)
    14. functionalBenefit: (String) 기능적 혜택 (고객의 고통을 해결하는 구체적 기능/시설)
    15. experientialBenefit: (String) 경험적 혜택 (입장부터 퇴장까지의 감정적 경험)
    16. symbolicBenefit: (String) 상징적 혜택 (브랜드를 소비함으로써 얻는 이미지)
    17. keywords: (String Array) 브랜드 키워드 5개 이상
    18. customerManagement: (String) 고객 관리 철학 (단골 및 팬덤 형성 전략)
    19. pomelli: {
         businessOverview: "사업 개요 (Business Overview) - 무엇을 하는 브랜드인지 2문장 요약",
         tagline: "짧고 강렬한 영문/한글 태그라인",
         brandArchetype: "브랜드 아키타입 (예: The Creator, The Hero, The Explorer 등)",
         toneOfVoice: ["Tone Keyword 1", "Tone Keyword 2", "Tone Keyword 3"],
         brandAesthetic: ["Aesthetic Keyword 1", "Aesthetic Keyword 2", "Aesthetic Keyword 3"],
         typography: "추천 폰트 스타일 및 타이포그래피 가이드",
         colors: [{ "name": "색상명", "hex": "#HEX", "description": "의미" }],
         brandValues: [{ "title": "핵심가치", "description": "설명" }]
    }

    반 반드시 JSON 포맷만 반환하세요.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });

    const text = response.text;
    if (!text) throw new Error("No data returned");
    return JSON.parse(text) as BrandPersona;
  } catch (error) {
    console.error("Error generating brand persona:", error);
    throw error;
  }
};

// --- Builder Mode Functions ---

// 1. Generate Planning Guides for ALL fields at once
export const generatePlanningGuides = async (idea: string, brandName?: string): Promise<Record<string, string[]>> => {
  const fieldsList = FIELD_METADATA.map(f => f.key).join(", ");
  
  const prompt = `
    당신은 까다롭고 날카로운 브랜드 컨설팅 퍼실리테이터입니다.
    사용자가 단순한 아이디어를 넘어서, 구체적이고 실행 가능한 전략을 짜낼 수 있도록 유도해야 합니다.
    
    사용자 아이디어: "${idea}"
    브랜드명: "${brandName || "미정"}"

    [주의사항]
    사용자가 입력한 아이디어의 업종(PC방, 만화카페, 포차 등)을 정확히 파악하고,
    해당 업종에서만 나올 수 있는 전문적인 질문을 던지세요. 두루뭉술한 일반적인 질문은 하지 마세요.

    다음 17가지 항목에 대해 사용자에게 질문할 "기획 가이드(질문)" 3가지를 제안하세요.

    [질문 스타일 예시]
    - 나쁜 예: "브랜드 철학은 무엇인가요?" (너무 추상적임)
    - 좋은 예(PC방): "최고 사양을 찾는 게이머들이 우리 매장에 와서 '와, 여기 미쳤다'라고 말하게 만들 '압도적인 장비 스펙'은 무엇입니까?"
    - 좋은 예(만화카페): "고객이 남의 시선을 신경 쓰지 않고 가장 편안하게 뒹굴거릴 수 있는 우리만의 '공간 구조(굴방/다락방 등)'의 특징은 무엇입니까?"
    - 좋은 예(포차): "술맛을 돋우는 우리 포차만의 조명 온도와 음악 선곡(BGM) 스타일은 구체적으로 어떤 느낌입니까?"

    대상 항목: ${fieldsList}
    
    응답 포맷 (JSON):
    {
      "philosophy": ["질문1", "질문2", "질문3"],
      ...
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });
    const text = response.text;
    if (!text) throw new Error("No guides returned");
    return JSON.parse(text);
  } catch (error) {
    console.error("Error generating guides:", error);
    throw error;
  }
};

// 2. Generate Draft for a SINGLE field
export const generateFieldDraft = async (
  fieldKey: string, 
  idea: string, 
  userInput: string, 
  context: string
): Promise<string> => {
  
  const prompt = `
    ${SYSTEM_INSTRUCTION}

    현재 작성 중인 항목: "${fieldKey}"
    브랜드 아이디어: "${idea}"
    
    [사용자의 핵심 기획 의도 (이 내용을 반드시 구체화하여 반영하세요)]
    "${userInput}"

    [참고 - 현재까지 확정된 다른 항목들]
    ${context}

    [요청]
    위 내용을 바탕으로 해당 항목(${fieldKey})에 들어갈 내용을 작성하세요.
    단순한 서술이 아니라, 전략 기획서의 한 페이지처럼 작성하세요.
    
    - **Tone & Style Reference:** 앞서 제시한 '더 벙커' 예시처럼 구체적인 스펙(시설/장비), 고유 명사(메뉴/시스템명), 해결하려는 고통, 제공하는 혜택을 명확히 하세요.
    - **Context Awareness:** 사용자가 PC방을 입력했으면 PC방 내용만, 만화카페면 만화카페 내용만 작성하세요. 섞지 마세요.
    - **Format:** 가독성을 위해 **소제목(###)**, **불렛 포인트(-)**, **볼드체(**)**를 적극 활용하세요.
    - **Length:** 내용은 최소 300자 이상 풍부하게 작성하세요.

    결과물은 설명 없이 내용(텍스트)만 반환하세요.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text || "내용을 생성할 수 없습니다.";
  } catch (error) {
    console.error(`Error generating draft for ${fieldKey}:`, error);
    return "오류가 발생했습니다.";
  }
};

// 3. Finalize and Assemble
export const finalizePersona = async (idea: string, builderState: BuilderState): Promise<BrandPersona> => {
  // Construct current state summary
  let summary = "";
  Object.entries(builderState).forEach(([key, state]) => {
    summary += `[${key}]: ${state.draft}\n`;
  });

  const prompt = `
    ${SYSTEM_INSTRUCTION}

    [브랜드 아이디어]: ${idea}
    
    [확정된 브랜드 기획 내용 (Drafts)]
    ${summary}

    위 내용을 종합하여 최종 "BrandPersona" JSON 객체를 완성하세요.
    
    1. 기존 Draft 내용들이 서로 논리적 모순 없이 하나의 강력한 브랜드 스토리로 이어지도록 다듬으세요 (Tone & Manner 통일).
    2. 각 항목은 구체적이고 설득력 있어야 합니다 (공간, 시설, 메뉴, 서비스 측면).
    3. **Pomelli (Business DNA) 섹션 작성 시 주의사항:**
       - 전체 기획 내용을 바탕으로 'Business Overview', 'Brand Archetype', 'Tone of Voice', 'Brand Aesthetic', 'Typography', 'Colors'를 상세하게 도출하세요.
    4. "keywords"는 JSON Array로 변환하세요.

    Response Schema: BrandPersona JSON structure (include expanded pomelli object).
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });
    return JSON.parse(response.text!) as BrandPersona;
  } catch (error) {
    console.error("Error finalizing persona:", error);
    throw error;
  }
};

// --- Image Gen ---
export const generateBrandImage = async (prompt: string): Promise<string | null> => {
  try {
    // Upgraded to gemini-3-pro-image-preview for better quality and reliability
    // Added safetySettings to prevent silent failures
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: { parts: [{ text: prompt }] },
      config: {
         imageConfig: {
             aspectRatio: "1:1",
             imageSize: "1K"
         },
         // Permissive safety settings to ensure generation
         safetySettings: [
            { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
            { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
            { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
            { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH }
         ]
      }
    });
    
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    console.warn("Image generation response did not contain inlineData");
    return null;
  } catch (error) {
    console.error("Image Gen Error", error);
    return null;
  }
};

export const generateImageWithCustomStyle = async (request: AnalysisRequest, persona: BrandPersona): Promise<string | null> => {
    const customStyle = request.customInputs?.['imageStyle'];
    const aesthetic = persona.pomelli?.brandAesthetic?.join(", ") || "Modern, Premium";
    const colors = persona.pomelli?.colors?.map(c => c.name).join(", ") || "Brand Colors";
    const mood = persona.pomelli?.toneOfVoice?.join(", ") || "Professional";

    // Construct a sophisticated prompt based on the analyzed persona
    const prompt = `
      You are an expert visual director and photographer. 
      Create a high-end, photorealistic brand concept image for the brand "${persona.brandName}".

      [Brand Analysis]
      - Philosophy: ${persona.philosophy.substring(0, 200)}...
      - Target Audience: ${persona.targetAudience.substring(0, 100)}...
      - Core Strategy: ${persona.coreStrategy.substring(0, 100)}...

      [Visual Direction]
      - Aesthetic Mood: ${aesthetic}
      - Key Colors: ${colors}
      - Brand Mood: ${mood}

      [Photography Instructions]
      - Style: **Photorealistic, Cinematic, 8k resolution, Highly Detailed.**
      - Lighting: Professional studio lighting or dramatic natural light, emphasizing textures and materials.
      - Composition: Balanced, high-quality commercial photography style.
      - Subject: A scene or an abstract representation that perfectly embodies the brand's core value (e.g., a high-end interior for a space brand, a sleek product shot for a product brand).
      - **Negative Prompt:** Do NOT include text, letters, watermarks, or low-quality vector art. No cartoons.

      ${customStyle ? `[User Additional Request]: ${customStyle}` : ''}
    `;

    return generateBrandImage(prompt);
};
