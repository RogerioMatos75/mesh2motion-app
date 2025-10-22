export class AIImageStudio {
  private dialog_element: HTMLDivElement | null = null
  private animation_player_original_display = 'none'

  // --- DOM ELEMENTS ---
  private generateBtn: HTMLButtonElement | null = null
  private spinner: HTMLDivElement | null = null
  private btnText: HTMLSpanElement | null = null
  private promptInput: HTMLTextAreaElement | null = null
  private imageContainer: HTMLDivElement | null = null
  private generatedImage: HTMLImageElement | null = null
  private loadingContainer: HTMLDivElement | null = null
  private resultPlaceholder: HTMLDivElement | null = null
  private apiKeyModal: HTMLDivElement | null = null
  private apiKeyInput: HTMLInputElement | null = null
  private saveApiKeyBtn: HTMLButtonElement | null = null

  // --- APP STATE ---
  private GEMINI_API_KEY = ''
  private currentMode = 'create'
  private activeCreateFunction = 'free'
  private activeEditFunction = 'add-remove'
  private currentImageBase64: string | null = null

  public show (): void {
    this.remove() // Ensure any old dialog is removed

    // Hide the main animation player as it conflicts with the modal layout
    const animPlayer = document.getElementById('animation-player')
    if (animPlayer !== null) {
      this.animation_player_original_display = animPlayer.style.display
      animPlayer.style.display = 'none'
    }

    const overlay = document.createElement('div')
    overlay.className = 'modal-dialog-overlay ai-studio-modal'
    overlay.addEventListener('click', (e) => {
      // Close if clicking on the overlay background
      if (e.target === overlay) {
        this.remove()
      }
    })

    const contentDiv = document.createElement('div')
    contentDiv.className = 'modal-dialog-content'

    // Get the inner HTML for the studio
    contentDiv.innerHTML = this.getHTMLContent()

    // Create and append the close button manually
    const closeButton = document.createElement('button')
    closeButton.className = 'modal-dialog-close'
    closeButton.innerText = 'Close'
    closeButton.addEventListener('click', () => { this.remove() })
    contentDiv.appendChild(closeButton)

    overlay.appendChild(contentDiv)
    document.body.appendChild(overlay)

    this.dialog_element = overlay

    // Initialize elements and listeners now that the dialog is in the DOM
    this.initializeDOMElements()
    this.attachEventListeners()
    this.updateUIVisibility()
  }

  public remove (): void {
    if (this.dialog_element !== null) {
      this.dialog_element.remove()
      this.dialog_element = null

      // Restore the animation player's original visibility state
      const animPlayer = document.getElementById('animation-player')
      if (animPlayer !== null) {
        animPlayer.style.display = this.animation_player_original_display
      }
    }
  }

  private getHTMLContent (): string {
    // HTML content for the studio, without the main dialog shell
    return `
        <div id="aiApiKeyModal" class="ai-studio-api-key-modal-overlay">
            <div class="ai-studio-api-key-modal">
                <h2>Bem-vindo ao AI Image Studio</h2>
                <p>Para começar, por favor, insira sua chave de API do Google Gemini.</p>
                <input type="password" id="aiApiKeyInput" class="ai-studio-api-key-input" placeholder="Sua Chave de API do Gemini">
                <button id="aiSaveApiKeyBtn" class="button ai-studio-api-key-save-btn">Salvar e Continuar</button>
            </div>
        </div>

        <div class="ai-studio-container">
            <div class="ai-studio-left-panel">
                <h1 class="ai-studio-panel-title">🎨 AI Image Studio</h1>
                <p class="ai-studio-panel-subtitle">Gerador profissional de imagens</p>

                <div class="prompt-section">
                    <div class="ai-studio-section-title">💭 Descreva sua ideia</div>
                    <textarea id="aiPrompt" class="ai-studio-prompt-input" placeholder="Descreva a imagem que você deseja criar..."></textarea>
                </div>

                <div class="ai-studio-mode-toggle">
                    <button class="ai-studio-mode-btn active" data-mode="create">Criar</button>
                    <button class="ai-studio-mode-btn" data-mode="edit">Editar</button>
                </div>

                <div id="aiCreateFunctions" class="functions-section">
                    <div class="ai-studio-section-title">Funções de Criação</div>
                    <div class="ai-studio-functions-grid" style="grid-template-columns: repeat(3, 1fr);">
                        <div class="ai-studio-function-card active" data-function="free">
                            <div class="icon">✨</div>
                            <div class="name">Prompt</div>
                        </div>
                        <div class="ai-studio-function-card" data-function="sticker">
                            <div class="icon">🏷️</div>
                            <div class="name">Adesivos</div>
                        </div>
                        <div class="ai-studio-function-card" data-function="text">
                            <div class="icon">📝</div>
                            <div class="name">Logo</div>
                        </div>
                        <div class="ai-studio-function-card" data-function="comic">
                            <div class="icon">💭</div>
                            <div class="name">HQ</div>
                        </div>
                        <div class="ai-studio-function-card" data-function="personagem">
                            <div class="icon">🧍</div>
                            <div class="name">Personagem</div>
                        </div>
                    </div>
                </div>

                <div id="aiEditFunctions" class="functions-section" style="display: none;">
                    <div class="ai-studio-section-title">Funções de Edição</div>
                    <div class="ai-studio-functions-grid">
                        <div class="ai-studio-function-card active" data-function="add-remove">
                            <div class="icon">➕</div>
                            <div class="name">Adicionar</div>
                        </div>
                        <div class="ai-studio-function-card" data-function="retouch">
                            <div class="icon">🎯</div>
                            <div class="name">Retoque</div>
                        </div>
                    </div>
                </div>

                <div id="aiUploadArea" class="ai-studio-upload-area">
                    <div class="icon">📁</div>
                    <div class="text">Clique ou arraste uma imagem</div>
                    <div class="subtext upload-text">PNG, JPG, WebP (máx. 10MB)</div>
                    <input type="file" id="aiImageUpload" accept="image/*" hidden>
                    <img id="aiImagePreview" class="ai-studio-image-preview" alt="Preview">
                </div>

                <button id="aiGenerateBtn" class="button ai-studio-generate-btn">
                    <div class="spinner"></div>
                    <span class="btn-text">🚀 Gerar Imagem</span>
                </button>
            </div>

            <div class="ai-studio-right-panel">
                <div id="aiResultPlaceholder" class="ai-studio-result-placeholder">
                    <div class="ai-studio-result-placeholder-icon">🎨</div>
                    <div>Sua obra de arte aparecerá aqui</div>
                </div>
                <div id="aiLoadingContainer" class="ai-studio-loading-container">
                    <div class="ai-studio-loading-spinner"></div>
                    <div class="ai-studio-loading-text">Gerando sua imagem...</div>
                </div>
                <div id="aiImageContainer" class="ai-studio-image-container">
                    <img id="aiGeneratedImage" class="ai-studio-generated-image" alt="Imagem Gerada">
                    <div class="ai-studio-image-actions">
                        <button class="ai-studio-action-btn" id="aiEditBtn" title="Editar">✏️</button>
                        <button class="ai-studio-action-btn" id="aiDownloadBtn" title="Download">💾</button>
                    </div>
                </div>
            </div>
        </div>
    `
  }

  private initializeDOMElements (): void {
    // Query elements within the scope of the dialog
    if (this.dialog_element === null) return

    this.generateBtn = this.dialog_element.querySelector('#aiGenerateBtn')
    if (this.generateBtn !== null) {
      this.spinner = this.generateBtn.querySelector('.spinner')
      this.btnText = this.generateBtn.querySelector('.btn-text')
    }
    this.promptInput = this.dialog_element.querySelector('#aiPrompt')
    this.imageContainer = this.dialog_element.querySelector('#aiImageContainer')
    this.generatedImage = this.dialog_element.querySelector('#aiGeneratedImage')
    this.loadingContainer = this.dialog_element.querySelector('#aiLoadingContainer')
    this.resultPlaceholder = this.dialog_element.querySelector('#aiResultPlaceholder')
    this.apiKeyModal = this.dialog_element.querySelector('#aiApiKeyModal')
    this.apiKeyInput = this.dialog_element.querySelector('#aiApiKeyInput')
    this.saveApiKeyBtn = this.dialog_element.querySelector('#aiSaveApiKeyBtn')
  }

  private attachEventListeners (): void {
    if (this.dialog_element === null) return

    // API Key Modal
    const storedApiKey = localStorage.getItem('geminiApiKey')
    if (storedApiKey !== null) {
      this.GEMINI_API_KEY = storedApiKey
      if (this.apiKeyModal !== null) this.apiKeyModal.style.display = 'none'
    } else {
        if (this.apiKeyModal !== null) this.apiKeyModal.style.display = 'flex'
    }

    this.saveApiKeyBtn?.addEventListener('click', () => {
      const key = this.apiKeyInput?.value.trim()
      if (key !== undefined && key !== '') {
        this.GEMINI_API_KEY = key
        localStorage.setItem('geminiApiKey', key)
        if (this.apiKeyModal !== null) this.apiKeyModal.style.display = 'none'
      } else {
        alert('Por favor, insira uma chave de API válida.')
      }
    })

    // Main functionality
    this.generateBtn?.addEventListener('click', () => { void this.generateImage() })
    this.dialog_element.querySelector('#aiDownloadBtn')?.addEventListener('click', () => { this.downloadImage() })
    this.dialog_element.querySelector('#aiEditBtn')?.addEventListener('click', () => { this.editCurrentImage() })

    this.dialog_element.querySelectorAll('.ai-studio-mode-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.dialog_element?.querySelector('.ai-studio-mode-btn.active')?.classList.remove('active')
        btn.classList.add('active')
        this.currentMode = (btn as HTMLElement).dataset.mode ?? 'create'
        this.updateUIVisibility()
      })
    })

    this.dialog_element.querySelectorAll('#aiCreateFunctions .ai-studio-function-card').forEach(card => {
      card.addEventListener('click', () => {
        this.dialog_element?.querySelector('#aiCreateFunctions .ai-studio-function-card.active')?.classList.remove('active')
        card.classList.add('active')
        this.activeCreateFunction = (card as HTMLElement).dataset.function ?? 'free'
      })
    })

    this.dialog_element.querySelectorAll('#aiEditFunctions .ai-studio-function-card').forEach(card => {
      card.addEventListener('click', () => {
        this.dialog_element?.querySelector('#aiEditFunctions .ai-studio-function-card.active')?.classList.remove('active')
        card.classList.add('active')
        this.activeEditFunction = (card as HTMLElement).dataset.function ?? 'add-remove'
      })
    })

    const uploadArea = this.dialog_element.querySelector('#aiUploadArea') as HTMLDivElement
    uploadArea.addEventListener('click', () => (this.dialog_element?.querySelector('#aiImageUpload') as HTMLInputElement).click())
    const imageUpload = this.dialog_element.querySelector('#aiImageUpload') as HTMLInputElement
    imageUpload.addEventListener('change', () => this.handleImageUpload(imageUpload, 'aiImagePreview'))
  }

  private updateUIVisibility (): void {
    if (this.dialog_element === null) return

    const createFunctions = this.dialog_element.querySelector('#aiCreateFunctions') as HTMLDivElement
    const editFunctions = this.dialog_element.querySelector('#aiEditFunctions') as HTMLDivElement
    const uploadArea = this.dialog_element.querySelector('#aiUploadArea') as HTMLDivElement

    if (this.currentMode === 'create') {
      createFunctions.style.display = 'block'
      editFunctions.style.display = 'none'
      uploadArea.style.display = 'none'
    } else { // edit mode
      createFunctions.style.display = 'none'
      editFunctions.style.display = 'block'
      uploadArea.style.display = 'block'
    }
  }

  private setLoading (isLoading: boolean): void {
    if (this.spinner === null || this.btnText === null || this.generateBtn === null || this.loadingContainer === null || this.resultPlaceholder === null || this.imageContainer === null) return

    if (isLoading) {
      this.spinner.style.display = 'block'
      this.btnText.textContent = 'Gerando...'
      this.generateBtn.disabled = true
      this.loadingContainer.style.display = 'block'
      this.resultPlaceholder.style.display = 'none'
      this.imageContainer.style.display = 'none'
    } else {
      this.spinner.style.display = 'none'
      this.btnText.textContent = '🚀 Gerar Imagem'
      this.generateBtn.disabled = false
      this.loadingContainer.style.display = 'none'
    }
  }

  private handleImageUpload (input: HTMLInputElement, previewId: string): void {
    if (this.dialog_element === null) return

    const file = input.files?.[0]
    if (file !== undefined) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const preview = this.dialog_element?.querySelector('#' + previewId) as HTMLImageElement
        if (e.target?.result !== null) {
          preview.src = e.target?.result as string
        }
        preview.style.display = 'block'
      }
      reader.readAsDataURL(file)
    }
  }

  private async generateImage (): Promise<void> {
    if (this.GEMINI_API_KEY === '') {
      if (this.apiKeyModal !== null) this.apiKeyModal.style.display = 'flex'
      return
    }
    const userPrompt = this.promptInput?.value.trim()
    if (userPrompt === undefined || userPrompt === '') {
      alert('Por favor, descreva a imagem que você deseja criar.')
      return
    }

    this.setLoading(true)

    let finalPrompt = userPrompt

    switch (this.activeCreateFunction) {
      case 'sticker':
        finalPrompt = `sticker of ${userPrompt}, die-cut, white background, cartoonish, vibrant colors`
        break
      case 'text':
        finalPrompt = `typographic logo design for "${userPrompt}", vector art, minimalist, black and white`
        break
      case 'comic':
        finalPrompt = `comic book panel style, ${userPrompt}, bold lines, halftone dots, dynamic action`
        break
      case 'personagem':
        finalPrompt = `character sheet for "${userPrompt}", full body, T-pose, open arms, separate legs, transparent background, no background, png, clean line art`
        break
    }

    try {
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image-preview:generateContent?key=${this.GEMINI_API_KEY}`

      const payload = {
        contents: [{
          parts: [{ text: finalPrompt }]
        }],
        generationConfig: {
            responseModalities: ['IMAGE']
        },
      }

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error.message ?? `HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      const base64Data = result?.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData)?.inlineData?.data

      if (base64Data !== undefined) {
        this.currentImageBase64 = base64Data
        const imageUrl = `data:image/png;base64,${base64Data}`
        if (this.generatedImage !== null && this.imageContainer !== null) {
          this.generatedImage.src = imageUrl
          this.imageContainer.style.display = 'block'
        }
      } else {
        throw new Error('Não foi possível encontrar dados de imagem na resposta da API.')
      }
    } catch (error: any) {
      console.error('Erro ao gerar imagem:', error)
      if (this.resultPlaceholder !== null && this.imageContainer !== null) {
        this.resultPlaceholder.style.display = 'block'
        this.imageContainer.style.display = 'none'

        let userFriendlyMessage
        if (error.message?.toLowerCase().includes('quota')) {
          userFriendlyMessage = `
            <div class="ai-studio-result-placeholder-icon">⚠️</div>
            <div style="font-weight: bold; margin-bottom: 8px;">Limite de Uso Atingido (Quota Exceeded)</div>
            <div style="font-size: 14px; max-width: 400px; margin: auto; line-height: 1.5;">
                A sua chave de API atingiu o limite de uso gratuito ou configurado.
                Por favor, verifique o seu plano e detalhes de faturamento na sua conta <a href="https://ai.google.dev/" target="_blank" rel="noopener noreferrer" style="color: #4A90E2;">Google AI Studio</a> ou no Google Cloud Console para continuar.
            </div>
          `
        } else {
          userFriendlyMessage = `<div class="ai-studio-result-placeholder-icon">⚠️</div><div>Ocorreu um erro: ${error.message as string}</div>`
        }
        this.resultPlaceholder.innerHTML = userFriendlyMessage
      }
    } finally {
      this.setLoading(false)
    }
  }

  private downloadImage (): void {
    if (this.generatedImage?.src !== null && this.currentImageBase64 !== null) {
      const link = document.createElement('a')
      link.href = this.generatedImage?.src as string
      link.download = 'imagem-gerada-ai.png'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  private editCurrentImage (): void {
    alert('A função de edição será implementada em breve!')
  }
}
