// webview-ui/src/App.tsx
import React, { useState, useEffect } from 'react';
import './App.css';
import { postMessage } from './vscode';
import SyntaxHighlighter from 'react-syntax-highlighter';
import { vs2015 } from 'react-syntax-highlighter/dist/esm/styles/hljs';
import { VSCodeButton, VSCodeTextArea } from '@vscode/webview-ui-toolkit/react';

// Define types for our data
interface PlanStep {
  file: string;
  action: 'CREATE' | 'MODIFY';
  description: string;
}

interface GeneratedCode {
  [key: string]: string; // Maps file path to generated code
}

function App() {
  const [prompt, setPrompt] = useState('');
  const [plan, setPlan] = useState<PlanStep[]>([]);
  const [generatedCode, setGeneratedCode] = useState<GeneratedCode>({});
  const [isLoading, setIsLoading] = useState(false);
  const [activeFile, setActiveFile] = useState<string | null>(null);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;
      switch (message.command) {
        case 'planGenerated':
          setPlan(message.payload.plan || []);
          setGeneratedCode({}); // Reset code when new plan arrives
          setActiveFile(null);
          setIsLoading(false);
          break;
        case 'codeGenerated':
          setGeneratedCode(prev => ({
            ...prev,
            [message.payload.step.file]: message.payload.code
          }));
          setActiveFile(message.payload.step.file); // Show the newly generated code
          setIsLoading(false);
          break;
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleGeneratePlan = () => {
    if (!prompt) return;
    setIsLoading(true);
    postMessage({ command: 'generatePlan', text: prompt });
  };

  const handleGenerateCode = (step: PlanStep) => {
    setIsLoading(true);
    setActiveFile(step.file); // Set active file immediately for better UX
    postMessage({ command: 'generateCode', step });
  };

  const handleApplyCode = (filePath: string) => {
    const codeToApply = generatedCode[filePath];
    if (codeToApply) {
        postMessage({ command: 'applyCode', filePath, code: codeToApply });
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>SpecGen AI Planner</h1>
        <VSCodeTextArea
          placeholder="Enter a high-level task, e.g., 'Add a Redux store for user management'"
          value={prompt}
          onInput={(e: any) => setPrompt(e.target.value)}
          rows={4}
          style={{ width: '100%' }}
        />
        <VSCodeButton onClick={handleGeneratePlan} disabled={isLoading || !prompt}>
          {isLoading ? 'Generating...' : 'Generate Plan'}
        </VSCodeButton>
      </header>

      <main className="main-content">
        <div className="plan-view">
          <h2>Implementation Plan</h2>
          {plan.length === 0 && !isLoading && <p>No plan generated yet.</p>}
          <ul>
            {plan.map((step, index) => (
              <li key={index} className={`plan-step ${activeFile === step.file ? 'active' : ''}`}>
                <strong>{step.action}:</strong> {step.file}
                <p>{step.description}</p>
                <VSCodeButton onClick={() => handleGenerateCode(step)} disabled={isLoading}>
                  Generate Code
                </VSCodeButton>
              </li>
            ))}
          </ul>
        </div>
        <div className="code-view">
            <h2>Generated Code</h2>
            {activeFile && generatedCode[activeFile] ? (
                <>
                    <div className="code-header">
                        <h3>{activeFile}</h3>
                        <VSCodeButton onClick={() => handleApplyCode(activeFile)}>Apply Code to File</VSCodeButton>
                    </div>
                    <SyntaxHighlighter language="typescript" style={vs2015} showLineNumbers>
                        {generatedCode[activeFile]}
                    </SyntaxHighlighter>
                </>
            ) : (
                <p>Select a plan step and click "Generate Code" to see the output here.</p>
            )}
        </div>
      </main>
    </div>
  );
}

export default App;
