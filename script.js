// --- 1. 샘플 데이터 (CSV 파일 기반) ---
const mockClaimDatabase = [
    {
        case_no: "2",
        patient_id: "921121-2xxxxxx",
        main_symptom_code: "J02.9",
        main_symptom_name: "급성 인두염",
        claim_serial_no: "9030134470",
        treatment_date: "2025.10.16",
        error_status: "검토 필요",
        error_description: "상병-약제 불일치 (규칙 2-1 기준)",
        review_result: "",
        prescription: "Amoxicillin 캡슐 (5일)"
    },
    {
        case_no: "4",
        patient_id: "650820-1xxxxxx",
        main_symptom_code: "K29.7",
        main_symptom_name: "상세불명의 위염",
        claim_serial_no: "9030134461",
        treatment_date: "2025.10.18",
        error_status: "검토 필요",
        error_description: "고가 검사 기준 초과 (규칙 4-1 기준)",
        review_result: "",
        prescription: "복부 CT (1회)"
    },
    {
        case_no: "6",
        patient_id: "750101-1xxxxxx",
        main_symptom_code: "J45.9",
        main_symptom_name: "상세불명의 천식",
        claim_serial_no: "9030134455",
        treatment_date: "2025.10.20",
        error_status: "검토 필요",
        error_description: "약제 단위 착오 (규칙 6-2 기준)",
        review_result: "",
        prescription: "천식흡입제 (1 Box)"
    },
    {
        case_no: "1",
        patient_id: "850510-1xxxxxx",
        main_symptom_code: "I10.9",
        main_symptom_name: "일차성 고혈압",
        claim_serial_no: "9030134495",
        treatment_date: "2025.10.15",
        error_status: "정상",
        error_description: "만성질환 관리 기준 적합",
        review_result: "",
        prescription: "고혈압 약제 (90일)"
    }
];

// --- 2. LLM 제안 시뮬레이션 함수 ---
function getAiSuggestions(claimSerialNo) {
    const suggestionsDB = {
        "9030134470": {
            suggestions: [
                { id: "opt1", text: "주 상병 코드를 'J03.0 세균성 편도염'으로 변경합니다." },
                { id: "opt2", text: "처방은 유지하되, EMR에 '2차 세균 감염 의심' 소견을 추가 기재합니다." },
                { id: "opt3", text: "해당 항생제(Amoxicillin) 처방을 삭제합니다." }
            ]
        },
        "9030134461": {
            suggestions: [
                { id: "opt1", text: "CT 검사를 '비급여(전액 본인 부담)'로 전환합니다." },
                { id: "opt2", text: "EMR에 '악성 종양 의심(R/O Gastric Cancer)' 소견을 추가 기재합니다." },
                { id: "opt3", text: "CT 검사 처방을 취소합니다." }
            ]
        },
        "9030134455": {
            suggestions: [
                { id: "opt1", text: "처방 수량을 '1 Box'에서 '120 EA'로 자동 변경합니다." },
                { id: "opt2", text: "처방 단위 'Box'를 'EA'로 변경합니다." }
            ]
        }
    };

    return new Promise(resolve => {
        setTimeout(() => {
            resolve(suggestionsDB[claimSerialNo] || { suggestions: [{ id: "opt1", text: "AI가 제안할 내용이 없습니다." }] });
        }, 500);
    });
}

// --- 3. UI 컨트롤 로직 ---
const modal = document.getElementById('suggestion-modal');
const modalContent = document.getElementById('modal-content');
let currentClaimSerial = null;

// 목록 생성
function populateClaimList() {
    const listElement = document.getElementById('claim-list');
    listElement.innerHTML = '';

    mockClaimDatabase.forEach(claim => {
        const needToReview = claim.error_status === '검토 필요';
        const reviewDone = claim.review_result === '이전처방 유지'
        const cardHtml = `
            <div id="card-${claim.claim_serial_no}" class="border rounded-lg p-4 flex justify-between items-center transition-all ${needToReview ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-white'}">
                <div>
                    <div class="flex items-center space-x-3">
                        <!-- <span class="font-semibold text-sm px-2 py-0.5 rounded ${needToReview ? 'bg-red-100 text-red-500' : 'bg-green-100 text-green-700'}">${claim.error_status}</span> -->
                        <span
                            class="font-semibold text-sm px-2 py-0.5 rounded ${
                                        needToReview
                                            ? 'bg-red-100 text-red-700'
                                            : reviewDone
                                                ? 'bg-blue-100 text-blue-700'
                                                : 'bg-green-100 text-green-700'
                                        }"
                            >
                            ${claim.error_status}
                        </span>
                        <span class="font-bold text-lg text-gray-800">${claim.main_symptom_name} (${claim.main_symptom_code})</span>
                    </div>
                    <p class="text-sm text-gray-600 mt-1">
                        환자: ${claim.patient_id} | 명세서: ${claim.claim_serial_no} | 처방: ${claim.prescription}
                    </p>
                    <p class="text-xs text-gray-500 mt-1">사유: <span id="desc-${claim.claim_serial_no}">${claim.error_description}</span></p>
                </div>
                <div>
                    ${needToReview ?
            `<button onclick="showSuggestionModal('${claim.claim_serial_no}')" class="bg-blue-600 text-white px-3 py-2 rounded-full text-sm font-semibold hover:bg-blue-700 transform hover:-translate-y-0.5 transition duration-200">
                                AI 검토
                             </button>` :
            `<button class="bg-gray-300 text-gray-600 px-3 py-2 rounded-full text-sm font-semibold cursor-not-allowed">${reviewDone ? '검토 완료' : '수정 완료'}</button>`
            }
                </div>
            </div>
        `;
        listElement.innerHTML += cardHtml;
    });
}

// 모달 표시
async function showSuggestionModal(claimSerialNo) {
    currentClaimSerial = claimSerialNo;
    const claimData = mockClaimDatabase.find(c => c.claim_serial_no === claimSerialNo);

    document.getElementById('modal-claim-id').textContent = claimSerialNo;
    document.getElementById('modal-error-description').textContent = claimData.error_description;
    document.getElementById('modal-symptom').textContent = `${claimData.main_symptom_name} (${claimData.main_symptom_code})`;
    document.getElementById('modal-prescription').textContent = claimData.prescription;

    modal.classList.remove('hidden');
    setTimeout(() => { modalContent.classList.remove('scale-95', 'opacity-0'); }, 10);

    const suggestionContainer = document.getElementById('modal-suggestions');
    suggestionContainer.innerHTML = '<div class="text-center text-gray-500">LLM(AI)이 삭감 방지 제안을 생성 중입니다...</div>';

    const response = await getAiSuggestions(claimSerialNo);

    suggestionContainer.innerHTML = '';
    response.suggestions.forEach((sug, index) => {
        suggestionContainer.innerHTML += `
            <label for="${sug.id}" class="block p-3 border rounded-full hover:bg-blue-50 cursor-pointer transition">
                <input type="radio" name="suggestion" id="${sug.id}" value="${sug.text}" class="custom-radio" ${index === 0 ? 'checked' : ''}>
                <span class="text-gray-700">${sug.text}</span>
            </label>
        `;
    });
}

// 모달 숨기기
function hideModal() {
    modalContent.classList.add('scale-95', 'opacity-0');
    setTimeout(() => { modal.classList.add('hidden'); }, 200);
}

// ✅ "처방 유지" 클릭 시 처리
function maintainReview() {
    if (!currentClaimSerial) return;

    const claimIndex = mockClaimDatabase.findIndex(c => c.claim_serial_no === currentClaimSerial);
    if (claimIndex !== -1) {
        const claim = mockClaimDatabase[claimIndex];
        claim.error_status = "검토 완료";
        claim.review_result = "이전처방 유지";
        claim.error_description = `<strong>[이전처방 유지] </strong>, ${claim.error_description}`;
    }

    populateClaimList();
    hideModal();
}

// '선택안으로 수정' 버튼 클릭 시
function submitFix() {
    const selectedCard = document.querySelector('input[name="suggestion"]:checked');
    if (!selectedCard) {
        console.error("수정안을 선택해주세요.");
        return;
    }

    const selectedText = selectedCard.value;
    const claimIndex = mockClaimDatabase.findIndex(c => c.claim_serial_no === currentClaimSerial);
    if (claimIndex !== -1) {
        mockClaimDatabase[claimIndex].error_status = '수정 완료';
        mockClaimDatabase[claimIndex].error_description = `<strong>[AI 제안 적용] </strong>${selectedText}`;
    }

    populateClaimList();
    hideModal();
}

function closeDialog() {
    hideModal();
}

window.onload = populateClaimList;
