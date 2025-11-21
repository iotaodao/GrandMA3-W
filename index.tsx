
import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenAI } from "@google/genai";

// --- Types ---

interface Snippet {
  label: string;
  text: string;
}

// --- Constants ---

const SNIPPETS: Record<string, Snippet[]> = {
  fix: [
    { label: 'Fix Typos', text: 'Fixtur 101 At Ful\nStor Cue 1 "My Cue" /o' },
    { label: 'Fix Logic (Wait)', text: 'Store Sequence 1 Cue 1\nLabel Sequence 1 "Test"\nGo Sequence 1' },
    { label: 'Fix MA2 Lua -> MA3', text: 'function main()\n  gma.cmd("Clear") -- MA2 syntax in MA3?\nend\nreturn main' },
    { label: 'Fix Variables', text: 'SetVar $myVar = "Hello" -- MA2 Syntax\nSetUserVar "myVar" "Hello" -- MA3 Syntax check' },
    { label: 'Fix Object Path', text: 'Assign Root().ShowData.DataPools.Default.Sequences[1] /name="Wow" -- Lua in Command Line?' }
  ],
  generateMacro: [
    { label: 'Cleanup System', text: 'Create a comprehensive cleanup macro that clears the programmer, resets all special masters to default, and turns off all running sequences except the selected one.' },
    { label: 'Store w/ Popup', text: 'Create a macro that stores a cue to the currently selected sequence, but first asks the user for a label via a popup input.' },
    { label: 'Toggle World', text: 'Create a toggle macro that switches the current user between World 1 (Full Rig) and World 2 (Floor Package) depending on which one is active.' },
    { label: 'Phaser Builder', text: 'Create a macro that builds a 2-step absolute Dimmer Phaser (0 to 100) with a width of 50% for the selected fixtures.' },
    { label: 'Conditional Exec', text: 'Create a macro that checks if Sequence 1 is running. If it is, turn it off. If it is not, go to Cue 1.' }
  ],
  generateLua: [
    { label: 'Iterate Selection', text: 'Write a Lua script that iterates through all currently selected fixtures (Subfixture 0) and prints their names and IDs to the System Monitor.' },
    { label: 'Create Color Preset', text: 'Create a Lua script that creates a new Color Preset 4.1 with random RGB values and labels it "Random".' },
    { label: 'Export Patch', text: 'Generate a Lua script that exports the current fixture patch (FID, Name, Address) to an XML file on the USB drive.' },
    { label: 'Custom UI Popup', text: 'Create a Lua script that shows a MessageBox with "Yes" and "No" buttons. If Yes is clicked, clear the programmer. If No, do nothing.' },
    { label: 'Recursive Find', text: 'Write a Lua script that recursively traverses the DataPool to find any Sequence labeled "Obsolete" and deletes it.' }
  ]
};

// --- Components ---

const Header = ({ onHelpClick }: { onHelpClick: () => void }) => (
  <header style={{
    backgroundColor: 'var(--bg-panel)',
    borderBottom: '1px solid var(--border)',
    padding: '1rem 2rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between'
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
      <div style={{
        width: '32px', height: '32px', background: 'var(--accent)', borderRadius: '4px',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: '#000'
      }}>MA</div>
      <h1 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 600 }}>GrandMA3 Macro Agent</h1>
    </div>
    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
      <button 
        onClick={onHelpClick}
        style={{
          background: 'transparent',
          border: '1px solid var(--border)',
          color: 'var(--text-muted)',
          borderRadius: '50%',
          width: '32px', 
          height: '32px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1rem',
          fontWeight: 'bold'
        }}
        title="Инструкция по установке"
      >
        ?
      </button>
      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>AI-Powered Assistant</span>
    </div>
  </header>
);

const TabButton = ({ active, onClick, children }: { active: boolean; onClick: () => void; children?: React.ReactNode }) => (
  <button
    onClick={onClick}
    style={{
      background: 'transparent',
      border: 'none',
      borderBottom: active ? '2px solid var(--accent)' : '2px solid transparent',
      color: active ? 'var(--accent)' : 'var(--text-muted)',
      padding: '1rem 1.5rem',
      cursor: 'pointer',
      fontSize: '1rem',
      fontWeight: 500,
      transition: 'all 0.2s'
    }}
  >
    {children}
  </button>
);

const Button = ({ onClick, disabled, children, primary = false, danger = false }: { onClick: () => void; disabled?: boolean; children?: React.ReactNode; primary?: boolean; danger?: boolean }) => {
  let bg = 'var(--bg-input)';
  let color = 'var(--text-main)';
  let border = '1px solid var(--border)';

  if (primary) {
    bg = 'var(--accent)';
    color = '#000';
    border = 'none';
  } else if (danger) {
    bg = 'rgba(255, 68, 68, 0.1)';
    color = 'var(--danger)';
    border = '1px solid var(--danger)';
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background: bg,
        color: color,
        border: border,
        padding: '0.5rem 1rem',
        borderRadius: '4px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontWeight: 600,
        opacity: disabled ? 0.5 : 1,
        transition: 'background 0.2s',
        width: 'fit-content',
        fontSize: '0.9rem'
      }}
    >
      {children}
    </button>
  );
};

const CodeEditor = ({ value, onChange, hasError }: { value: string, onChange: (val: string) => void, hasError?: boolean }) => (
  <textarea
    value={value}
    onChange={(e) => onChange(e.target.value)}
    placeholder="// Paste your Macro/Lua code here or describe what you want to generate..."
    style={{
      width: '100%',
      height: '200px',
      backgroundColor: 'var(--bg-input)',
      color: 'var(--text-main)',
      border: hasError ? '1px solid var(--danger)' : '1px solid var(--border)',
      borderRadius: '4px',
      padding: '1rem',
      fontFamily: 'var(--font-mono)',
      fontSize: '0.9rem',
      resize: 'vertical',
      outline: 'none',
      transition: 'border-color 0.2s'
    }}
  />
);

const OutputPanel = ({ content, loading, error }: { content: string | null; loading: boolean; error: string | null }) => {
  if (loading) {
    return (
      <div style={{ 
        padding: '2rem', textAlign: 'center', color: 'var(--text-muted)',
        background: 'var(--bg-panel)', borderRadius: '4px', border: '1px solid var(--border)' 
      }}>
        <div className="spinner" style={{ marginBottom: '1rem' }}>Processing...</div>
        <span style={{ fontSize: '0.9rem' }}>AI is analyzing your request</span>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        padding: '1.5rem',
        background: 'rgba(255, 68, 68, 0.1)',
        border: '1px solid var(--danger)',
        borderRadius: '4px',
        color: 'var(--text-main)'
      }}>
        <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--danger)', fontSize: '1rem' }}>Input Validation Error</h3>
        <p style={{ margin: 0, fontSize: '0.9rem' }}>{error}</p>
      </div>
    );
  }

  if (!content) {
    return (
      <div style={{ 
        padding: '3rem', textAlign: 'center', color: 'var(--text-muted)',
        background: 'var(--bg-panel)', borderRadius: '4px', border: '1px dashed var(--border)'
      }}>
        Output will appear here...
      </div>
    );
  }

  return (
    <div style={{
      background: 'var(--bg-panel)',
      border: '1px solid var(--border)',
      borderRadius: '4px',
      overflow: 'hidden'
    }}>
      <div style={{
        padding: '0.5rem 1rem',
        borderBottom: '1px solid var(--border)',
        background: '#252525',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>RESULT</span>
        <Button onClick={() => navigator.clipboard.writeText(content)} primary={false}>Copy</Button>
      </div>
      <pre style={{
        margin: 0,
        padding: '1rem',
        overflowX: 'auto',
        fontFamily: 'var(--font-mono)',
        fontSize: '0.9rem',
        whiteSpace: 'pre-wrap',
        color: '#d4d4d4'
      }}>
        {content}
      </pre>
    </div>
  );
};

const SnippetChip: React.FC<{ label: string, onClick: () => void }> = ({ label, onClick }) => (
  <button
    onClick={onClick}
    style={{
      background: 'var(--bg-panel)',
      border: '1px solid var(--border)',
      borderRadius: '20px',
      padding: '0.4rem 0.8rem',
      color: 'var(--text-muted)',
      fontSize: '0.8rem',
      cursor: 'pointer',
      transition: 'all 0.2s',
      whiteSpace: 'nowrap'
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.borderColor = 'var(--accent)';
      e.currentTarget.style.color = 'var(--text-main)';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.borderColor = 'var(--border)';
      e.currentTarget.style.color = 'var(--text-muted)';
    }}
  >
    {label}
  </button>
);

const HelpModal = ({ onClose }: { onClose: () => void }) => (
  <div style={{
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(0,0,0,0.8)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000
  }} onClick={onClose}>
    <div style={{
      background: 'var(--bg-panel)',
      padding: '2rem',
      borderRadius: '8px',
      maxWidth: '700px',
      width: '90%',
      border: '1px solid var(--border)',
      maxHeight: '85vh',
      overflowY: 'auto',
      color: 'var(--text-main)',
      boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
    }} onClick={e => e.stopPropagation()}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ margin: 0, color: 'var(--accent)' }}>Установка и запуск</h2>
        <Button onClick={onClose}>Закрыть</Button>
      </div>
      
      <div style={{ lineHeight: '1.6', fontSize: '0.95rem' }}>
        <p>Чтобы запустить это приложение на собственном сервере или создать Windows версию, следуйте инструкции:</p>
        
        <h3 style={{ color: 'var(--text-muted)', marginTop: '1.5rem' }}>1. Предварительные требования</h3>
        <ul style={{ paddingLeft: '1.5rem' }}>
          <li>Node.js (версии 18 или выше)</li>
          <li>npm или yarn</li>
          <li>API ключ от Google Gemini (получить в AI Studio)</li>
        </ul>

        <h3 style={{ color: 'var(--text-muted)', marginTop: '1.5rem' }}>2. Установка</h3>
        <div style={{ background: 'var(--bg-input)', padding: '1rem', borderRadius: '4px', fontFamily: 'var(--font-mono)', fontSize: '0.85rem', border: '1px solid var(--border)' }}>
          git clone https://github.com/your-repo/ma3-agent.git<br/>
          cd ma3-agent<br/>
          npm install
        </div>

        <h3 style={{ color: 'var(--text-muted)', marginTop: '1.5rem' }}>3. Конфигурация</h3>
        <p>Создайте файл <code>.env</code> в корне проекта и добавьте ваш API ключ:</p>
        <div style={{ background: 'var(--bg-input)', padding: '1rem', borderRadius: '4px', fontFamily: 'var(--font-mono)', fontSize: '0.85rem', border: '1px solid var(--border)' }}>
          API_KEY=AIzaSyYourSecretKeyHere...
        </div>

        <h3 style={{ color: 'var(--text-muted)', marginTop: '1.5rem' }}>4. Сервер (PM2)</h3>
        <div style={{ background: 'var(--bg-input)', padding: '1rem', borderRadius: '4px', fontFamily: 'var(--font-mono)', fontSize: '0.85rem', border: '1px solid var(--border)' }}>
            <span style={{ color: '#666' }}>// Сборка и запуск</span><br/>
            npm install -g pm2<br/>
            npm run build<br/>
            pm2 serve dist 3000 --name "ma3-agent" --spa<br/>
            pm2 save
        </div>

        <h3 style={{ color: 'var(--text-muted)', marginTop: '1.5rem' }}>5. Версия для Windows (.exe)</h3>
        <p>Вы можете упаковать приложение в исполняемый файл .exe с помощью Electron:</p>
        <div style={{ background: 'var(--bg-input)', padding: '1rem', borderRadius: '4px', fontFamily: 'var(--font-mono)', fontSize: '0.85rem', border: '1px solid var(--border)' }}>
            <span style={{ color: '#666' }}>// 1. Установите Electron</span><br/>
            npm install --save-dev electron electron-builder concurrently wait-on<br/><br/>
            
            <span style={{ color: '#666' }}>// 2. Создайте файл electron.js в корне</span><br/>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>(Скопируйте код из файла README.md)</span><br/><br/>

            <span style={{ color: '#666' }}>// 3. Добавьте скрипт в package.json</span><br/>
            "electron:build": "npm run build && electron-builder"<br/><br/>

            <span style={{ color: '#666' }}>// 4. Соберите приложение</span><br/>
            npm run electron:build
        </div>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          Полный код для electron.js и настройки package.json находится в файле README.md.
        </p>

      </div>
    </div>
  </div>
);

// --- Main App ---

const App = () => {
  const [activeTab, setActiveTab] = useState<'fix' | 'generateMacro' | 'generateLua'>('fix');
  const [input, setInput] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  // Clear error when input changes
  useEffect(() => {
    if (error) setError(null);
  }, [input, activeTab]);

  const handleSnippetClick = (text: string) => {
    setInput(text);
    setError(null);
    setResult(null);
  };

  const handleProcess = async () => {
    if (!input.trim()) {
      setError("Please enter code or a description first.");
      return;
    }

    // --- Validation Logic ---
    const trimmedInput = input.trim();
    
    // Keywords for Validation
    const ma3Keywords = /\b(Store|Copy|Move|Delete|Assign|Set|Call|Go|Off|On|Top|Learn|List|Page|Seq|Cue|Fixture|Group|Preset|Matrick|Phaser|SetUserVar|SetGlobalVar|GetVar|Plugin|Macro)\b/i;
    const luaKeywords = /\b(function|local|return|end|if|then|else|elseif|for|while|do|break|pairs|ipairs|tostring|tonumber|print|gma|Cmd|Echo|Printf|MessageBox|TextInput)\b/;
    const generationKeywords = /\b(create|write|generate|make|i want|build|script)\b/i;

    if (activeTab === 'fix') {
      // Check if user is trying to generate something instead of fixing
      if (generationKeywords.test(trimmedInput) && !ma3Keywords.test(trimmedInput) && !luaKeywords.test(trimmedInput)) {
        setError("It looks like you want to create something new. Please switch to the 'Generate Macro' or 'Generate Lua' tab.");
        return;
      }

      // Check if there is minimal code-like structure for fixing
      if (!ma3Keywords.test(trimmedInput) && !luaKeywords.test(trimmedInput)) {
        // Allow loose matching, but warn if completely unrelated
        // We'll rely on length check if no keywords found to be safe
        if (trimmedInput.length < 10) {
           setError("The input doesn't look like valid GrandMA3 syntax or Lua code. Please paste the code you want to fix.");
           return;
        }
      }
    } else {
      // Generate Modes
      if (trimmedInput.length < 10) {
        setError("Please provide a more detailed description of what you want to generate.");
        return;
      }
    }

    setLoading(true);
    setResult(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      let systemInstruction = "";
      let prompt = "";

      if (activeTab === 'fix') {
        systemInstruction = "You are an expert GrandMA3 lighting console programmer. Your task is to analyze existing Macros or Lua scripts, identify syntax errors (differentiating between MA2 and MA3 syntax), logic flaws, or inefficiencies, and provide the corrected code. Explain the changes briefly.";
        prompt = `Analyze and fix this GrandMA3 code:\n\n${input}`;
      } else if (activeTab === 'generateMacro') {
        systemInstruction = "You are an expert GrandMA3 lighting console programmer. Create efficient, Command Line based Macros based on user requirements. Use standard MA3 syntax (e.g., 'SetUserVar', 'Store Sequence'). Avoid Lua unless specifically requested or absolutely necessary for the logic.";
        prompt = `Create a GrandMA3 Macro for this requirement:\n\n${input}`;
      } else {
        systemInstruction = "You are an expert GrandMA3 Lua developer. Write robust Lua scripts for the GrandMA3 environment. Use the object-free API where possible, or standard object manipulation. Ensure proper error handling and function structure (return main).";
        prompt = `Write a GrandMA3 Lua script for this requirement:\n\n${input}`;
      }

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          systemInstruction: systemInstruction
        }
      });

      setResult(response.text);
    } catch (err) {
      console.error(err);
      setResult("Error processing request. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Header onHelpClick={() => setShowHelp(true)} />
      <div style={{ 
        flex: 1, 
        display: 'flex', 
        flexDirection: 'column', 
        maxWidth: '1200px', 
        margin: '0 auto', 
        width: '100%',
        padding: '2rem' 
      }}>
        
        {/* Tabs */}
        <div style={{ 
          display: 'flex', 
          borderBottom: '1px solid var(--border)',
          marginBottom: '2rem'
        }}>
          <TabButton active={activeTab === 'fix'} onClick={() => setActiveTab('fix')}>
            Fix Code
          </TabButton>
          <TabButton active={activeTab === 'generateMacro'} onClick={() => setActiveTab('generateMacro')}>
            Generate Macro
          </TabButton>
          <TabButton active={activeTab === 'generateLua'} onClick={() => setActiveTab('generateLua')}>
            Generate Lua
          </TabButton>
        </div>

        {/* Main Content Area */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', height: '100%' }}>
          
          {/* Left Column: Input */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', width: '100%', marginBottom: '0.25rem' }}>
                Examples:
              </span>
              {SNIPPETS[activeTab].map((snippet, i) => (
                <SnippetChip 
                  key={i} 
                  label={snippet.label} 
                  onClick={() => handleSnippetClick(snippet.text)} 
                />
              ))}
            </div>

            <CodeEditor 
              value={input} 
              onChange={setInput} 
              hasError={!!error}
            />
            
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button onClick={handleProcess} disabled={loading || !input} primary>
                {activeTab === 'fix' ? 'Analyze & Fix' : 'Generate'}
              </Button>
            </div>
          </div>

          {/* Right Column: Output */}
          <div style={{ height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <OutputPanel content={result} loading={loading} error={error} />
          </div>
          
        </div>
      </div>
      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
    </>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
