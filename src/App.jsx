import { useState, useEffect, useRef } from 'react';
import { Users, Brain, Send, Mic, Play, Pause, RotateCcw, Video, Copy, Link } from './components/Icons';
import { supabase } from './lib/supabase';

// ステージの定義
const STAGES = {
  ROLE_SELECT: 'role_select',
  HOST_SETUP: 'host_setup',
  GUEST_SELECT: 'guest_select',
  SETUP: 'setup',
  BRAINSTORM: 'brainstorm',
  AI_ANALYSIS: 'ai_analysis',
  MAPPING: 'mapping',
  DISCUSSION: 'discussion',
  REMAP: 'remap'
};

// 役割の定義
const ROLES = {
  HOST: 'host',
  GUEST: 'guest'
};

// ステージにパスワード入力画面を追加
const STAGES_WITH_PASSWORD = {
  ...STAGES,
  HOST_PASSWORD: 'host_password'
};

// 環境変数からAPIキーを取得
const ANTHROPIC_API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY;
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

// 開発環境判定
const isDevelopment = import.meta.env.DEV;

function App() {
  const [stage, setStage] = useState(STAGES.ROLE_SELECT);
  const [hostPassword, setHostPassword] = useState('');
  const [passwordAttempt, setPasswordAttempt] = useState('');
  const [selectedTopicForHostLogin, setSelectedTopicForHostLogin] = useState(null);
  const [role, setRole] = useState(null);
  const [showOnlyMyTopics, setShowOnlyMyTopics] = useState(false);
  const [topic, setTopic] = useState('');
  const [topicDescription, setTopicDescription] = useState('');
  const [topicGoal, setTopicGoal] = useState('');
  const [topicQuestion1, setTopicQuestion1] = useState('');
  const [topicQuestion2, setTopicQuestion2] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [uploadedFileUrl, setUploadedFileUrl] = useState('');
  const [selectedDate, setSelectedDate] = useState(null);
  const [meetUrl, setMeetUrl] = useState('');
  const [currentSessionMeetUrl, setCurrentSessionMeetUrl] = useState('');
  const [availableTopics, setAvailableTopics] = useState([]);
  const [isPickerLoaded, setIsPickerLoaded] = useState(false);
  const [isLoadingTopics, setIsLoadingTopics] = useState(true);
  const [selectedTopicId, setSelectedTopicId] = useState(null);
  const [currentUser, setCurrentUser] = useState({ id: '', name: '' });
  const [currentParticipantId, setCurrentParticipantId] = useState(null);
  const [session, setSession] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [messages, setMessages] = useState([]);
  const [ideas, setIdeas] = useState([]);
  const [timeRemaining, setTimeRemaining] = useState(600);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [mappedIdeas, setMappedIdeas] = useState(null);
  const [currentInput, setCurrentInput] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // ゲスト画面の状態管理
  const [currentQuestionSection, setCurrentQuestionSection] = useState('question1'); // 'question1', 'question2', 'solution'
  const [messagesQ1, setMessagesQ1] = useState([]);
  const [messagesQ2, setMessagesQ2] = useState([]);
  const [selectedSolution, setSelectedSolution] = useState('');
  const [solutionReason, setSolutionReason] = useState('');
  const [showAllOpinions, setShowAllOpinions] = useState(false);

  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);

  // 2026年4月〜6月の木曜日12-13時の日程を生成
  const generateThursdaySchedule = () => {
    const thursdays = [];
    const startDate = new Date(2026, 3, 1); // 2026年4月
    const endDate = new Date(2026, 6, 30); // 2026年6月末
    
    let currentDate = new Date(startDate);
    
    // 最初の木曜日を見つける
    while (currentDate.getDay() !== 4) {
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // 全ての木曜日をリストアップ
    while (currentDate <= endDate) {
      thursdays.push({
        date: new Date(currentDate),
        formatted: currentDate.toLocaleDateString('ja-JP', { month: 'long', day: 'numeric' }),
        iso: currentDate.toISOString().split('T')[0]
      });
      currentDate.setDate(currentDate.getDate() + 7);
    }
    
    return thursdays;
  };

  const thursdaySchedule = generateThursdaySchedule();

  // 認証状態を監視
  useEffect(() => {
    // 現在のセッションを取得
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        setCurrentUser({
          id: session.user.id,
          name: session.user.user_metadata.full_name || session.user.email?.split('@')[0] || '名無し'
        });
      }
      setIsAuthLoading(false);
    });

    // 認証状態の変更を監視
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        setCurrentUser({
          id: session.user.id,
          name: session.user.user_metadata.full_name || session.user.email?.split('@')[0] || '名無し'
        });
      } else {
        setCurrentUser({ id: '', name: '' });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Supabaseからセッション一覧を取得
  useEffect(() => {
    fetchSessions();

    // リアルタイム同期: セッションの変更を監視
    const sessionsSubscription = supabase
      .channel('sessions-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'sessions' },
        (payload) => {
          console.log('セッション変更検知:', payload);
          // セッション一覧を再取得
          fetchSessions();
        }
      )
      .subscribe();

    // クリーンアップ
    return () => {
      sessionsSubscription.unsubscribe();
    };
  }, []);

  const fetchSessions = async () => {
    try {
      setIsLoadingTopics(true);
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('status', 'upcoming')
        .order('start_date', { ascending: true });

      if (error) {
        console.error('Supabaseからのデータ取得エラー:', error);
        // エラー時はダミーデータを表示
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const nextMonth = new Date(today);
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        const lastMonth = new Date(today);
        lastMonth.setMonth(lastMonth.getMonth() - 1);

        setAvailableTopics([
          {
            id: '1',
            title: '地域コミュニティの活性化',
            description: '地域住民が交流できる新しい仕組みを考えます',
            host_name: '山田太郎',
            start_date: tomorrow.toISOString().split('T')[0],
            end_date: nextMonth.toISOString().split('T')[0],
            created_at: new Date().toISOString()
          },
          {
            id: '2',
            title: '教育現場でのAI活用',
            description: '学校や教育機関でAIを効果的に使う方法',
            host_name: '佐藤花子',
            start_date: lastMonth.toISOString().split('T')[0],
            end_date: nextMonth.toISOString().split('T')[0],
            created_at: new Date().toISOString()
          },
          {
            id: '3',
            title: '環境に優しい生活習慣',
            description: 'サステナブルな暮らし方のアイデア',
            host_name: '鈴木一郎',
            start_date: lastMonth.toISOString().split('T')[0],
            end_date: yesterday.toISOString().split('T')[0],
            created_at: new Date().toISOString()
          }
        ]);
      } else {
        setAvailableTopics(data || []);
      }
    } catch (err) {
      console.error('セッション取得エラー:', err);
    } finally {
      setIsLoadingTopics(false);
    }
  };

  // Googleでログイン
  const signInWithGoogle = async () => {
    // 開発環境では簡易ログイン
    if (isDevelopment) {
      const devUserName = prompt('開発モード：ユーザー名を入力してください', 'Yoshi Ota');
      if (devUserName) {
        setCurrentUser({
          id: 'dev-user-' + Date.now(),
          name: devUserName
        });
        // 擬似的なセッションを作成
        setSession({
          user: {
            id: 'dev-user-' + Date.now(),
            email: 'dev@example.com',
            user_metadata: {
              full_name: devUserName,
              avatar_url: null
            }
          }
        });
      }
      return;
    }

    // 本番環境はGoogle OAuth
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
          scopes: 'openid email profile https://www.googleapis.com/auth/calendar.events'
        }
      });
      if (error) {
        console.error('Google認証エラー:', error);
        alert('ログインに失敗しました');
      }
    } catch (err) {
      console.error('予期しないエラー:', err);
    }
  };

  // ログアウト
  const signOut = async () => {
    // 開発環境では簡易ログアウト
    if (isDevelopment) {
      setSession(null);
      setCurrentUser({ id: '', name: '' });
      return;
    }

    // 本番環境はSupabase認証
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('ログアウトエラー:', error);
      }
    } catch (err) {
      console.error('予期しないエラー:', err);
    }
  };

  // Google Drive Picker APIを初期化
  useEffect(() => {
    const loadPicker = () => {
      if (window.gapi && window.google) {
        window.gapi.load('picker', () => {
          setIsPickerLoaded(true);
        });
      }
    };

    // スクリプトが読み込まれるまで待つ
    if (window.gapi) {
      loadPicker();
    } else {
      window.addEventListener('load', loadPicker);
      return () => window.removeEventListener('load', loadPicker);
    }
  }, []);

  // Google Drive Pickerを開く
  const openGoogleDrivePicker = () => {
    if (!isPickerLoaded || !session) {
      alert('Google Driveにアクセスするには、まずGoogleアカウントでログインしてください。');
      return;
    }

    const accessToken = session.provider_token;
    if (!accessToken) {
      alert('Google認証トークンが見つかりません。再度ログインしてください。');
      return;
    }

    const picker = new window.google.picker.PickerBuilder()
      .addView(
        new window.google.picker.DocsView(window.google.picker.ViewId.DOCS)
          .setMimeTypes('application/pdf')
      )
      .setOAuthToken(accessToken)
      .setDeveloperKey(import.meta.env.VITE_GOOGLE_API_KEY || '')
      .setCallback((data) => {
        if (data.action === window.google.picker.Action.PICKED) {
          const file = data.docs[0];
          setUploadedFile({
            name: file.name,
            id: file.id,
            url: file.url
          });
          setUploadedFileUrl(file.url);
          console.log('選択されたファイル:', file);
        }
      })
      .build();

    picker.setVisible(true);
  };

  useEffect(() => {
    let interval;
    if (isTimerActive && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            setIsTimerActive(false);
            if (stage === STAGES.BRAINSTORM) {
              handleStageComplete();
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerActive, timeRemaining, stage]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // リアルタイム同期: アイデアの変更を監視
  useEffect(() => {
    if (!selectedTopicId || stage !== STAGES.BRAINSTORM) return;

    const ideasSubscription = supabase
      .channel(`ideas-${selectedTopicId}`)
      .on('postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'ideas',
          filter: `session_id=eq.${selectedTopicId}`
        },
        async (payload) => {
          console.log('新しいアイデア検知:', payload);
          
          // 参加者情報を取得
          const { data: participant } = await supabase
            .from('participants')
            .select('name')
            .eq('id', payload.new.participant_id)
            .single();

          // 自分が投稿したアイデアは既に表示されているのでスキップ
          if (payload.new.participant_id === currentParticipantId) return;

          // 他の参加者のアイデアをメッセージとして追加
          const newMessage = {
            id: payload.new.id,
            userId: payload.new.participant_id,
            userName: participant?.name || '参加者',
            content: payload.new.content,
            timestamp: new Date(payload.new.created_at),
            type: 'user'
          };

          setMessages((prev) => [...prev, newMessage]);
          setIdeas((prev) => [...prev, { userId: payload.new.participant_id, content: payload.new.content }]);
        }
      )
      .subscribe();

    return () => {
      ideasSubscription.unsubscribe();
    };
  }, [selectedTopicId, stage, currentParticipantId]);

  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'ja-JP';

      recognitionRef.current.onresult = (event) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript + ' ';
          }
        }
        if (finalTranscript) {
          setTranscript((prev) => prev + finalTranscript);
        }
      };
    }
  }, []);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const startBrainstorm = async () => {
    if (topic && currentUser.name) {
      // 参加者をSupabaseに登録
      if (selectedTopicId) {
        try {
          const { data, error } = await supabase
            .from('participants')
            .insert([
              {
                session_id: selectedTopicId,
                name: currentUser.name,
                role: role || ROLES.GUEST
              }
            ])
            .select()
            .single();

          if (!error && data) {
            setCurrentParticipantId(data.id);
          }
        } catch (err) {
          console.error('参加者登録エラー:', err);
        }
      }
      
      setStage(STAGES.BRAINSTORM);
      setIsTimerActive(true);
      setTimeRemaining(600);
    }
  };

  const sendMessage = async () => {
    if (!currentInput.trim()) return;

    const userMessage = {
      id: Date.now(),
      userId: currentUser.id,
      userName: currentUser.name,
      content: currentInput,
      timestamp: new Date(),
      type: 'user'
    };

    // 現在の問いセクションに応じてメッセージを追加
    const currentMessages = currentQuestionSection === 'question1' ? messagesQ1 : messagesQ2;
    const setCurrentMessages = currentQuestionSection === 'question1' ? setMessagesQ1 : setMessagesQ2;

    setCurrentMessages((prev) => [...prev, userMessage]);
    setIdeas((prev) => [...prev, { userId: currentUser.id, content: currentInput, questionSection: currentQuestionSection }]);

    const ideaContent = currentInput;
    setCurrentInput('');

    // Supabaseにアイデアを保存（セッションIDがある場合）
    if (selectedTopicId && currentParticipantId) {
      try {
        await supabase
          .from('ideas')
          .insert([
            {
              session_id: selectedTopicId,
              participant_id: currentParticipantId,
              content: ideaContent,
              question_section: currentQuestionSection
            }
          ]);
      } catch (error) {
        console.error('アイデア保存エラー:', error);
      }
    }

    try {
      console.log('AI APIリクエスト開始:', { topic, ideaContent, currentQuestionSection });

      // 現在のお題情報を取得
      const currentTopic = availableTopics.find(t => t.id === selectedTopicId);

      const response = await fetch('http://localhost:3001/api/ai/question', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          topic: topic,
          idea: ideaContent,
          goal: currentTopic?.goal || '',
          question1: currentTopic?.question1 || '',
          question2: currentTopic?.question2 || '',
          currentQuestion: currentQuestionSection === 'question1' ? currentTopic?.question1 : currentTopic?.question2,
          previousMessages: currentMessages
        })
      });

      console.log('Proxy APIレスポンスステータス:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Proxy APIエラーレスポンス:', errorData);
        throw new Error(`Proxy Error: ${response.status} - ${JSON.stringify(errorData)}`);
      }

      const data = await response.json();
      console.log('AI APIレスポンスデータ:', data);

      const aiQuestion = data.content[0].text;

      const aiMessage = {
        id: Date.now() + 1,
        userId: 'ai',
        userName: 'AIファシリテーター',
        content: aiQuestion,
        timestamp: new Date(),
        type: 'ai'
      };

      setCurrentMessages((prev) => [...prev, aiMessage]);
      console.log('AIメッセージ追加成功:', aiQuestion);
    } catch (error) {
      console.error('AI質問生成エラー:', error);
      console.error('エラー詳細:', error.message);
      const errorMessage = {
        id: Date.now() + 1,
        userId: 'ai',
        userName: 'AIファシリテーター',
        content: `エラーが発生しました（${error.message}）。それは興味深いアイデアですね。もう少し詳しく教えていただけますか？`,
        timestamp: new Date(),
        type: 'ai'
      };
      setCurrentMessages((prev) => [...prev, errorMessage]);
    }
  };

  const handleStageComplete = async () => {
    setIsTimerActive(false);
    setStage(STAGES.AI_ANALYSIS);
    setIsAnalyzing(true);

    try {
      // Gemini APIを使用
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `テーマ「${topic}」について、以下のアイデアが出されました：

${ideas.map((idea, i) => `${i + 1}. ${idea.content}`).join('\n')}

これらのアイデアを分析し、以下のJSON形式で返してください：
{
  "clusters": [
    {
      "theme": "クラスタのテーマ",
      "ideas": [アイデアのインデックス番号の配列],
      "summary": "このクラスタの要約"
    }
  ],
  "key_points": ["論点1", "論点2", "論点3"]
}

JSONのみを返し、他の説明は不要です。`
            }]
          }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 4000
          }
        })
      });

      const data = await response.json();
      const analysisText = data.candidates[0].content.parts[0].text;
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        const analysis = JSON.parse(jsonMatch[0]);
        setMappedIdeas(analysis);
        setIsAnalyzing(false);
        setTimeout(() => setStage(STAGES.MAPPING), 1000);
      }
    } catch (error) {
      console.error('AI分析エラー:', error);
      const dummyAnalysis = {
        clusters: [
          {
            theme: "分析結果",
            ideas: ideas.map((_, i) => i),
            summary: "収集されたアイデアの概要"
          }
        ],
        key_points: ["論点1: アイデアの整理が必要", "論点2: 具体的な実施方法の検討", "論点3: 次のアクション"]
      };
      setMappedIdeas(dummyAnalysis);
      setIsAnalyzing(false);
      setTimeout(() => setStage(STAGES.MAPPING), 1000);
    }
  };

  const startDiscussion = () => {
    setStage(STAGES.DISCUSSION);
    setTranscript('');
  };

  const toggleRecording = () => {
    if (!recognitionRef.current) {
      alert('音声認識がサポートされていません。Chrome, Edge, Safariをお使いください。');
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
    }
    setIsRecording(!isRecording);
  };

  const remapIdeas = async () => {
    setStage(STAGES.AI_ANALYSIS);
    setIsAnalyzing(true);
    
    try {
      // Gemini APIを使用
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `元のテーマ「${topic}」に対する初期アイデア：
${ideas.map((idea, i) => `${i + 1}. ${idea.content}`).join('\n')}

ディスカッションの議事録：
${transcript}

この議事録を踏まえて、アイデアを再分析し、以下のJSON形式で返してください：
{
  "clusters": [
    {
      "theme": "クラスタのテーマ",
      "ideas": [アイデアのインデックス番号の配列],
      "summary": "このクラスタの要約"
    }
  ],
  "key_points": ["論点1", "論点2", "論点3"],
  "new_insights": ["ディスカッションから得られた新しい洞察1", "洞察2"]
}

JSONのみを返し、他の説明は不要です。`
            }]
          }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 4000
          }
        })
      });

      const data = await response.json();
      const analysisText = data.candidates[0].content.parts[0].text;
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        const analysis = JSON.parse(jsonMatch[0]);
        setMappedIdeas(analysis);
        setIsAnalyzing(false);
        setTimeout(() => setStage(STAGES.REMAP), 1000);
      }
    } catch (error) {
      console.error('再マッピングエラー:', error);
      const dummyAnalysis = {
        ...mappedIdeas,
        new_insights: ["ディスカッションを通じて新たな視点が得られました", "具体的な実施方法が明確になりました"]
      };
      setMappedIdeas(dummyAnalysis);
      setIsAnalyzing(false);
      setTimeout(() => setStage(STAGES.REMAP), 1000);
    }
  };

  // 役割選択画面（トップページ）
  if (stage === STAGES.ROLE_SELECT) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-rose-50 p-8 animate-fadeIn">
        <div className="max-w-6xl mx-auto">
          {/* ヘッダー */}
          <div className="text-center mb-8">
            <h1 className="text-6xl font-bold mb-4 gradient-text">
              みんなで熟議して課題を特定しよう
            </h1>
            <p className="text-xl text-gray-600 font-medium mb-6">AI-Powered Discussion System</p>
          </div>

          {/* 説明セクション */}
          <div className="bg-white rounded-3xl shadow-xl p-10 mb-12">
            <div className="max-w-5xl mx-auto">
              <div className="mb-6">
                <p className="text-lg text-gray-700 leading-relaxed text-center mb-8">
                  課題解決のアイディアを生み出す上で最も重要なのは、<span className="font-bold text-orange-600">「何を課題として設定するか」</span>です。<br />
                  このシステムは、デザイン思考のダブルダイヤモンドの<span className="font-bold text-pink-600">左側（問題発見）</span>に焦点を当て、<br />
                  参加者全員で熟議を重ねながら、真に解決すべき課題を特定していきます。
                </p>
              </div>

              {/* ダブルダイヤモンド図 */}
              <div className="relative mb-8">
                {/* タイトルを画像上部に配置 */}
                <div className="text-center mb-3">
                  <h3 className="text-sm font-semibold text-gray-500">&lt;デザイン思考のダブルダイヤモンド&gt;</h3>
                </div>

                {/* 画像を表示 */}
                <div className="flex justify-center">
                  <img
                    src="/double-diamond.png"
                    alt="デザイン思考のダブルダイヤモンド"
                    className="w-full max-w-4xl h-auto"
                  />
                </div>

                <div className="text-center mt-6 text-sm text-gray-600">
                  <p className="inline-flex items-center gap-2">
                    <span className="w-4 h-4 rounded-full bg-yellow-400"></span>
                    <span className="font-semibold">このシステムが支援する範囲</span>
                    ：対象領域の特定 → 課題の特定
                  </p>
                </div>
              </div>

              <div className="bg-gradient-to-r from-rose-50 to-pink-50 rounded-2xl p-6 text-center">
                <p className="text-gray-800 font-semibold text-lg">
                  🤖 AIファシリテーターがディスカッションをサポートし、<br />
                  参加者の多様な視点を統合して、本質的な課題を浮き彫りにします
                </p>
              </div>
            </div>
          </div>

          {/* ユーザー情報（ログイン状態を右上に小さく表示） */}
          {session && (
            <div className="fixed top-4 right-4 z-50">
              <div className="bg-white rounded-xl shadow-lg p-3 flex items-center gap-3">
                {session.user.user_metadata.avatar_url && (
                  <img
                    src={session.user.user_metadata.avatar_url}
                    alt={currentUser.name}
                    className="w-8 h-8 rounded-full"
                  />
                )}
                <div className="text-sm">
                  <div className="font-semibold text-gray-900">{currentUser.name}</div>
                </div>
                <button
                  onClick={signOut}
                  className="px-3 py-1 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-all"
                >
                  ログアウト
                </button>
              </div>
            </div>
          )}

          {/* お題一覧セクション */}
          <div className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-3xl font-bold text-gray-900">
                📋 {showOnlyMyTopics ? '作成したお題' : '開催予定のお題'}
              </h2>
              <div className="flex items-center gap-3">
                {showOnlyMyTopics && (
                  <button
                    onClick={() => setShowOnlyMyTopics(false)}
                    className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-all"
                  >
                    すべて表示
                  </button>
                )}
                <span className="text-sm text-gray-500">
                  {showOnlyMyTopics
                    ? `${availableTopics.filter(t => t.host_name === currentUser.name).length}件のお題`
                    : `${availableTopics.length}件のお題`
                  }
                </span>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-6 mb-8">
              {isLoadingTopics ? (
                // ローディング表示
                <div className="col-span-3 text-center py-12">
                  <div className="inline-block w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                  <p className="text-gray-600">お題を読み込み中...</p>
                </div>
              ) : availableTopics.filter(t => !showOnlyMyTopics || t.host_name === currentUser.name).length === 0 ? (
                // データがない場合
                <div className="col-span-3 text-center py-12 bg-white rounded-2xl">
                  <div className="text-6xl mb-4">📋</div>
                  <p className="text-xl text-gray-700 mb-2">
                    {showOnlyMyTopics ? 'まだお題を作成していません' : 'まだお題がありません'}
                  </p>
                  <p className="text-sm text-gray-500">
                    {showOnlyMyTopics ? '「お題を新規作成」ボタンから作成しましょう' : 'ホストとして最初のお題を作成しましょう！'}
                  </p>
                </div>
              ) : (
                availableTopics
                  .filter(t => !showOnlyMyTopics || t.host_name === currentUser.name)
                  .map((topicItem) => {
                  // 日付の安全な処理
                  let displayDate = '日時未設定';
                  try {
                    if (topicItem.start_date && topicItem.end_date) {
                      const start = new Date(topicItem.start_date);
                      const end = new Date(topicItem.end_date);
                      const startStr = `${String(start.getMonth() + 1).padStart(2, '0')}/${String(start.getDate()).padStart(2, '0')}`;
                      const endStr = `${String(end.getMonth() + 1).padStart(2, '0')}/${String(end.getDate()).padStart(2, '0')}`;
                      displayDate = `${startStr}〜${endStr}`;
                    } else if (topicItem.start_date) {
                      const start = new Date(topicItem.start_date);
                      displayDate = `${String(start.getMonth() + 1).padStart(2, '0')}/${String(start.getDate()).padStart(2, '0')}`;
                    } else if (topicItem.created_at) {
                      const created = new Date(topicItem.created_at);
                      displayDate = `${String(created.getMonth() + 1).padStart(2, '0')}/${String(created.getDate()).padStart(2, '0')}`;
                    }
                  } catch (error) {
                    console.error('日付のパースエラー:', error);
                    displayDate = '日時未設定';
                  }

                  // 開催期間のチェック
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  let isActive = false;

                  try {
                    if (topicItem.start_date && topicItem.end_date) {
                      const start = new Date(topicItem.start_date);
                      const end = new Date(topicItem.end_date);
                      start.setHours(0, 0, 0, 0);
                      end.setHours(23, 59, 59, 999);
                      isActive = today >= start && today <= end;
                    }
                  } catch (error) {
                    console.error('日付比較エラー:', error);
                  }

                  return (
                    <div
                      key={topicItem.id}
                      className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all duration-300"
                    >
                      <div className="mb-4">
                        <div className="text-xs text-orange-600 font-semibold mb-2">📅 開催期間: {displayDate}</div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">{topicItem.title}</h3>
                        <p className="text-sm text-gray-600 line-clamp-2">{topicItem.description}</p>
                      </div>

                      <div className="pt-4 border-t border-gray-100 space-y-3">
                        {/* ホスト名（キャプション） */}
                        {showOnlyMyTopics ? (
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              // 自分のお題の場合、直接編集画面へ
                              setRole(ROLES.HOST);
                              setSelectedTopicId(topicItem.id);
                              setTopic(topicItem.title);
                              setTopicDescription(topicItem.description);

                              // データベースから詳細情報を取得
                              const { data, error } = await supabase
                                .from('sessions')
                                .select('*')
                                .eq('id', topicItem.id)
                                .single();

                              if (!error && data) {
                                setTopicGoal(data.goal || '');
                                setTopicQuestion1(data.question1 || '');
                                setTopicQuestion2(data.question2 || '');
                                setStartDate(data.start_date || '');
                                setEndDate(data.end_date || '');
                                setUploadedFileUrl(data.pdf_url || '');
                                if (data.pdf_url) {
                                  setUploadedFile({ name: 'uploaded.pdf', url: data.pdf_url });
                                }
                              }

                              setStage(STAGES.HOST_SETUP);
                            }}
                            className="w-full text-left px-4 py-3 bg-orange-50 hover:bg-orange-100 rounded-xl transition-all duration-300 border border-orange-200"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-600">🎯 ホスト: {topicItem.host_name}</span>
                              </div>
                              <div className="text-xs text-orange-600 font-semibold">
                                ✏️ 修正
                              </div>
                            </div>
                          </button>
                        ) : (
                          <div className="text-xs text-gray-500 px-2">
                            🎯 ホスト: {topicItem.host_name}
                          </div>
                        )}

                        {/* ゲスト参加ボタン */}
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            if (!showOnlyMyTopics && isActive) {
                              // ログインしていない場合はプロンプトで名前を入力
                              if (!session && isDevelopment) {
                                const guestName = prompt('開発モード：ゲスト名を入力してください', 'ゲスト');
                                if (guestName) {
                                  setCurrentUser({
                                    id: 'guest-' + Date.now(),
                                    name: guestName
                                  });
                                }
                              }

                              setRole(ROLES.GUEST);
                              setSelectedTopicId(topicItem.id);
                              setTopic(topicItem.title);
                              setTopicDescription(topicItem.description);

                              // データベースから詳細情報を取得
                              const { data, error } = await supabase
                                .from('sessions')
                                .select('*')
                                .eq('id', topicItem.id)
                                .single();

                              if (!error && data) {
                                setCurrentSessionMeetUrl(data.meet_url || '');
                              }

                              // GUEST_SELECT画面をスキップして直接ブレインストーミング画面へ
                              setStage(STAGES.BRAINSTORM);
                              setIsTimerActive(true);
                              setTimeRemaining(600);
                            }
                          }}
                          disabled={showOnlyMyTopics || !isActive}
                          className={`w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all duration-300 ${
                            showOnlyMyTopics || !isActive
                              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                              : 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white hover:shadow-lg hover:scale-[1.02]'
                          }`}
                        >
                          <span>👥</span>
                          <span>{isActive ? '参加する' : '期間外'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* アクションボタンセクション */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* お題を新規作成ボタン */}
            <button
              onClick={async () => {
                if (!session) {
                  // 未ログインの場合、Google認証を実行
                  await signInWithGoogle();
                } else {
                  // ログイン済みの場合、ホストセットアップ画面へ
                  setRole(ROLES.HOST);
                  setStage(STAGES.HOST_SETUP);
                }
              }}
              className="bg-white rounded-2xl shadow-lg p-8 hover:shadow-xl hover:scale-[1.02] transition-all duration-300 group"
            >
              <div className="text-center">
                <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center text-white text-4xl group-hover:scale-110 transition-transform">
                  ➕
                </div>
                <h3 className="text-2xl font-bold mb-2 text-gray-900">お題を新規作成</h3>
                <p className="text-sm text-gray-600">
                  {session ? 'ホストとして新しいお題を作成' : 'Googleでログインして作成'}
                </p>
              </div>
            </button>

            {/* 作成したお題を修正ボタン */}
            <button
              onClick={async () => {
                if (!session) {
                  // 未ログインの場合、Google認証を実行
                  await signInWithGoogle();
                } else {
                  // ログイン済みの場合、自分のお題のみを表示
                  setShowOnlyMyTopics(true);
                  // 上にスクロール
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }
              }}
              className="bg-white rounded-2xl shadow-lg p-8 hover:shadow-xl hover:scale-[1.02] transition-all duration-300 group border-2 border-orange-200"
            >
              <div className="text-center">
                <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-rose-400 to-pink-500 rounded-full flex items-center justify-center text-white text-4xl group-hover:scale-110 transition-transform">
                  ✏️
                </div>
                <h3 className="text-2xl font-bold mb-2 text-gray-900">作成したお題を修正</h3>
                <p className="text-sm text-gray-600">
                  {session ? 'ホストとして既存のお題を編集' : 'Googleでログインして管理'}
                </p>
              </div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ホストパスワード入力画面
  if (stage === 'host_password') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 p-8 animate-fadeIn flex items-center justify-center">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-3xl shadow-2xl p-10">
            <div className="text-center mb-8">
              <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-orange-400 to-amber-500 rounded-full flex items-center justify-center text-white text-4xl">
                🔒
              </div>
              <h2 className="text-3xl font-bold mb-2 text-gray-900">ホストでログイン</h2>
              <p className="text-gray-600">
                {selectedTopicForHostLogin?.title}
              </p>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">パスワード</label>
                <input
                  type="password"
                  value={passwordAttempt}
                  onChange={(e) => setPasswordAttempt(e.target.value)}
                  onKeyPress={async (e) => {
                    if (e.key === 'Enter' && passwordAttempt) {
                      try {
                        const { data, error } = await supabase
                          .from('sessions')
                          .select('*')
                          .eq('id', selectedTopicForHostLogin.id)
                          .single();

                        if (error) {
                          console.error('セッション取得エラー:', error);
                          alert('セッション情報の取得に失敗しました');
                          return;
                        }

                        if (data.host_password_hash === passwordAttempt) {
                          setRole(ROLES.HOST);
                          setTopic(selectedTopicForHostLogin.title);
                          setTopicDescription(selectedTopicForHostLogin.description);
                          setTopicBackground(data.background || '');
                          setTopicCurrentSituation(data.current_situation || '');
                          setTopicChallenge(data.challenge || '');
                          setCurrentUser({ ...currentUser, name: selectedTopicForHostLogin.host_name, id: Date.now().toString() });
                          setStage(STAGES.BRAINSTORM);
                          setIsTimerActive(true);
                          setTimeRemaining(600);
                          setPasswordAttempt('');
                        } else {
                          alert('パスワードが正しくありません');
                          setPasswordAttempt('');
                        }
                      } catch (err) {
                        console.error('認証エラー:', err);
                        alert('認証処理でエラーが発生しました');
                      }
                    }
                  }}
                  className="w-full px-6 py-4 border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:ring-4 focus:ring-orange-100 transition-all text-lg"
                  placeholder="ホストパスワードを入力"
                  autoFocus
                />
                <div className="mt-2 text-xs text-gray-500">
                  💡 デモ用パスワード: <code className="bg-gray-100 px-2 py-1 rounded">host123</code>
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => {
                    setStage(STAGES.ROLE_SELECT);
                    setPasswordAttempt('');
                    setSelectedTopicForHostLogin(null);
                  }}
                  className="flex-1 py-4 bg-gray-200 text-gray-700 rounded-xl font-bold text-lg hover:bg-gray-300 transition-all duration-300"
                >
                  キャンセル
                </button>
                <button
                  onClick={async () => {
                    try {
                      // Supabaseでパスワード確認
                      const { data, error } = await supabase
                        .from('sessions')
                        .select('*')
                        .eq('id', selectedTopicForHostLogin.id)
                        .single();

                      if (error) {
                        console.error('セッション取得エラー:', error);
                        alert('セッション情報の取得に失敗しました');
                        return;
                      }

                      // パスワード確認（将来はハッシュ化して比較）
                      if (data.host_password_hash === passwordAttempt) {
                        setRole(ROLES.HOST);
                        setTopic(selectedTopicForHostLogin.title);
                        setTopicDescription(selectedTopicForHostLogin.description);
                        setTopicBackground(data.background || '');
                        setTopicCurrentSituation(data.current_situation || '');
                        setTopicChallenge(data.challenge || '');
                        setCurrentUser({ ...currentUser, name: selectedTopicForHostLogin.host_name, id: Date.now().toString() });
                        setStage(STAGES.BRAINSTORM);
                        setIsTimerActive(true);
                        setTimeRemaining(600);
                        setPasswordAttempt('');
                      } else {
                        alert('パスワードが正しくありません');
                        setPasswordAttempt('');
                      }
                    } catch (err) {
                      console.error('認証エラー:', err);
                      alert('認証処理でエラーが発生しました');
                    }
                  }}
                  disabled={!passwordAttempt}
                  className="flex-1 py-4 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-xl hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                >
                  ログイン
                </button>
              </div>
            </div>

            <div className="mt-6 p-4 bg-orange-50 rounded-xl">
              <div className="text-sm text-gray-700">
                <div className="font-semibold mb-1">💡 ヒント</div>
                <ul className="text-xs space-y-1 text-gray-600">
                  <li>• ホストとしてログインすると、セッション管理ができます</li>
                  <li>• パスワードは後でSupabaseで管理予定</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ホスト用セットアップ画面
  if (stage === STAGES.HOST_SETUP) {
    // 修正モードの場合
    if (selectedTopicId) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 p-8 animate-fadeIn">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <div className="inline-block px-4 py-2 bg-orange-100 text-orange-800 rounded-full text-sm font-semibold mb-4">
                🎯 ホストモード - 修正
              </div>
              <h1 className="text-5xl font-bold mb-4 gradient-text">
                お題を修正
              </h1>
              <p className="text-lg text-gray-700">
                各項目をクリックして内容を修正できます
              </p>
            </div>

            <div className="space-y-6">
              {/* タイトルカード */}
              <div className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-gray-500 mb-2">タイトル</div>
                    <input
                      type="text"
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      className="w-full text-xl font-bold text-gray-900 border-2 border-gray-200 rounded-lg px-4 py-2 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* 概要カード */}
              <div className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-gray-500 mb-2">概要</div>
                    <textarea
                      value={topicDescription}
                      onChange={(e) => setTopicDescription(e.target.value)}
                      className="w-full text-gray-700 border-2 border-gray-200 rounded-lg px-4 py-3 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all resize-none"
                      rows="4"
                    />
                  </div>
                </div>
              </div>

              {/* 目指したいことカード */}
              <div className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-gray-500 mb-2">目指したいこと</div>
                    <textarea
                      value={topicGoal}
                      onChange={(e) => setTopicGoal(e.target.value)}
                      className="w-full text-gray-700 border-2 border-gray-200 rounded-lg px-4 py-3 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all resize-none"
                      rows="3"
                    />
                  </div>
                </div>
              </div>

              {/* 問い①カード */}
              <div className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-gray-500 mb-2">問い①</div>
                    <textarea
                      value={topicQuestion1}
                      onChange={(e) => setTopicQuestion1(e.target.value)}
                      className="w-full text-gray-700 border-2 border-gray-200 rounded-lg px-4 py-3 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all resize-none"
                      rows="4"
                    />
                  </div>
                </div>
              </div>

              {/* 問い②カード */}
              <div className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-gray-500 mb-2">問い②</div>
                    <textarea
                      value={topicQuestion2}
                      onChange={(e) => setTopicQuestion2(e.target.value)}
                      className="w-full text-gray-700 border-2 border-gray-200 rounded-lg px-4 py-3 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all resize-none"
                      rows="4"
                    />
                  </div>
                </div>
              </div>

              {/* 開催期間カード */}
              <div className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all">
                <div className="text-sm font-semibold text-gray-500 mb-4">開催期間</div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-600 mb-2">開始日</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-2">終了日</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* 資料PDFカード */}
              <div className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all">
                <div className="text-sm font-semibold text-gray-500 mb-4">資料PDF（オプション）</div>
                {uploadedFile ? (
                  <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border-2 border-green-200">
                    <div className="flex items-center gap-3">
                      <div className="text-2xl">📄</div>
                      <div>
                        <div className="font-semibold text-gray-900">{uploadedFile.name}</div>
                        <div className="text-xs text-gray-600">アップロード済み</div>
                      </div>
                    </div>
                    <button
                      onClick={openGoogleDrivePicker}
                      className="px-4 py-2 text-sm bg-white border-2 border-green-500 text-green-700 rounded-lg hover:bg-green-50 transition-all"
                    >
                      変更
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={openGoogleDrivePicker}
                    className="w-full border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-orange-500 hover:bg-orange-50 transition-all"
                  >
                    <div className="text-gray-600">
                      <div className="text-3xl mb-2">☁️</div>
                      <div className="font-semibold">Google DriveからPDFを選択</div>
                    </div>
                  </button>
                )}
              </div>

              {/* ミーティングURLカード */}
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <div className="text-sm font-semibold text-gray-500 mb-4">ミーティングURL（自動生成）</div>
                <div className="bg-gray-50 rounded-lg px-4 py-3 border-2 border-gray-200 text-gray-600 font-mono text-sm">
                  {`https://meet.google.com/brainstorm-${selectedTopicId.slice(0, 8)}`}
                </div>
              </div>

              {/* 保存ボタン */}
              <div className="flex gap-4 pt-4">
                <button
                  onClick={() => {
                    setStage(STAGES.ROLE_SELECT);
                    setRole(null);
                    setSelectedTopicId(null);
                    setShowOnlyMyTopics(false);
                    setTopic('');
                    setTopicDescription('');
                    setTopicGoal('');
                    setTopicQuestion1('');
                    setTopicQuestion2('');
                    setStartDate('');
                    setEndDate('');
                    setUploadedFile(null);
                    setUploadedFileUrl('');
                  }}
                  className="flex-1 py-4 bg-gray-200 text-gray-700 rounded-xl font-bold text-lg hover:bg-gray-300 transition-all"
                >
                  キャンセル
                </button>
                <button
                  onClick={() => {
                    if (topic && topicDescription && topicGoal && topicQuestion1 && topicQuestion2 && startDate && endDate) {
                      setShowConfirmModal(true);
                    }
                  }}
                  disabled={!topic || !topicDescription || !topicGoal || !topicQuestion1 || !topicQuestion2 || !startDate || !endDate}
                  className="flex-1 py-4 bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-xl hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  変更を保存
                </button>
              </div>
            </div>

            {/* 確認モーダル（修正モード用） */}
            {showConfirmModal && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fadeIn">
                <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                  <div className="p-8">
                    <div className="text-center mb-6">
                      <div className="text-5xl mb-4">✏️</div>
                      <h2 className="text-3xl font-bold text-gray-900 mb-2">
                        お題の更新内容を確認
                      </h2>
                      <p className="text-sm text-gray-600">
                        以下の内容で更新します
                      </p>
                    </div>

                    <div className="bg-gray-50 rounded-2xl p-6 mb-6 space-y-4 text-left">
                      <div>
                        <div className="text-xs font-semibold text-gray-500 mb-1">タイトル</div>
                        <div className="text-lg font-bold text-gray-900">{topic}</div>
                      </div>

                      <div>
                        <div className="text-xs font-semibold text-gray-500 mb-1">概要</div>
                        <div className="text-sm text-gray-700 whitespace-pre-wrap">{topicDescription}</div>
                      </div>

                      <div>
                        <div className="text-xs font-semibold text-gray-500 mb-1">目指したいこと</div>
                        <div className="text-sm text-gray-700 whitespace-pre-wrap">{topicGoal}</div>
                      </div>

                      <div>
                        <div className="text-xs font-semibold text-gray-500 mb-1">問い①</div>
                        <div className="text-sm text-gray-700 whitespace-pre-wrap">{topicQuestion1}</div>
                      </div>

                      <div>
                        <div className="text-xs font-semibold text-gray-500 mb-1">問い②</div>
                        <div className="text-sm text-gray-700 whitespace-pre-wrap">{topicQuestion2}</div>
                      </div>

                      <div>
                        <div className="text-xs font-semibold text-gray-500 mb-1">開催期間</div>
                        <div className="text-sm text-gray-700">{startDate} 〜 {endDate}</div>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={async () => {
                          try {
                            const generatedMeetUrl = `https://meet.google.com/brainstorm-${selectedTopicId.slice(0, 8)}`;

                            const { error } = await supabase
                              .from('sessions')
                              .update({
                                title: topic,
                                description: topicDescription,
                                goal: topicGoal,
                                question1: topicQuestion1,
                                question2: topicQuestion2,
                                start_date: startDate,
                                end_date: endDate,
                                pdf_url: uploadedFileUrl || null,
                                meet_url: generatedMeetUrl
                              })
                              .eq('id', selectedTopicId);

                            if (error) {
                              console.error('セッション更新エラー:', error);
                              alert('セッションの更新に失敗しました。もう一度お試しください。');
                              return;
                            }

                            alert(`セッションを更新しました！✨`);

                            setShowConfirmModal(false);
                            setStage(STAGES.ROLE_SELECT);
                            setShowOnlyMyTopics(false);
                            setSelectedTopicId(null);
                            setTopic('');
                            setTopicDescription('');
                            setTopicGoal('');
                            setTopicQuestion1('');
                            setTopicQuestion2('');
                            setStartDate('');
                            setEndDate('');
                            setUploadedFile(null);
                            setUploadedFileUrl('');
                            fetchSessions();
                          } catch (err) {
                            console.error('予期しないエラー:', err);
                            alert('予期しないエラーが発生しました。');
                          }
                        }}
                        className="flex-1 py-4 bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-xl font-bold text-lg hover:shadow-xl transition-all"
                      >
                        この内容で更新する
                      </button>
                    </div>

                    <button
                      onClick={() => setShowConfirmModal(false)}
                      className="w-full mt-3 py-3 text-gray-600 hover:text-gray-900 font-semibold transition-all"
                    >
                      キャンセル
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }

    // 新規作成モード
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 p-8 animate-fadeIn">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <div className="inline-block px-4 py-2 bg-orange-100 text-orange-800 rounded-full text-sm font-semibold mb-4">
              🎯 ホストモード
            </div>
            <h1 className="text-5xl font-bold mb-4 gradient-text">
              お題を作成
            </h1>
            <p className="text-lg text-gray-700">
              お題を設定してセッションを開始しましょう
            </p>
          </div>

          <div className="bg-white rounded-3xl shadow-2xl p-10 space-y-8">
            {/* タイトル */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">タイトル</label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="w-full px-6 py-4 border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:ring-4 focus:ring-orange-100 transition-all text-lg"
                placeholder="例：地域の公共交通を持続可能にするには"
              />
            </div>

            {/* 概要 */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">概要</label>
              <textarea
                value={topicDescription}
                onChange={(e) => setTopicDescription(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:ring-4 focus:ring-orange-100 transition-all resize-none"
                rows="4"
                placeholder="例：人口減少により公共交通の利用者が減少し、財政負担が増大しています。住民の移動手段をどう確保するか、その合意をどう形成していくかが課題です。"
              />
            </div>

            {/* PDF資料アップロード */}
            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">📎</span>
                <h3 className="text-xl font-bold text-gray-900">資料PDF（オプション）</h3>
              </div>
              <button
                type="button"
                onClick={openGoogleDrivePicker}
                className="w-full border-2 border-dashed border-blue-300 rounded-xl p-8 text-center hover:border-blue-500 hover:bg-blue-50 transition-colors cursor-pointer"
              >
                {uploadedFile ? (
                  <div className="text-green-600">
                    <div className="text-4xl mb-2">✓</div>
                    <div className="font-semibold">{uploadedFile.name}</div>
                    <div className="text-sm text-gray-600 mt-1">クリックで変更</div>
                  </div>
                ) : (
                  <div className="text-gray-600">
                    <div className="text-4xl mb-2">☁️</div>
                    <div className="font-semibold mb-1">Google DriveからPDFを選択</div>
                    <div className="text-sm">クリックしてファイルを選択</div>
                  </div>
                )}
              </button>
              {!session && isDevelopment && (
                <p className="text-xs text-orange-600 mt-2 text-center">
                  💡 開発モードでは資料アップロードは省略可能です
                </p>
              )}
            </div>

            {/* 目指したいこと */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">目指したいこと</label>
              <textarea
                value={topicGoal}
                onChange={(e) => setTopicGoal(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:ring-4 focus:ring-orange-100 transition-all resize-none"
                rows="3"
                placeholder="例：10年後も20年後も、住民みんなが安心して移動できる地域であり続ける"
              />
            </div>

            {/* 問い① */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">問い①</label>
              <textarea
                value={topicQuestion1}
                onChange={(e) => setTopicQuestion1(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:ring-4 focus:ring-orange-100 transition-all resize-none"
                rows="4"
                placeholder="例：現在の公共交通の何が問題？&#10;路線や本数を減らすべきか、それとも別の解決策があるのか、みんなの意見を教えて！"
              />
            </div>

            {/* 問い② */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">問い②</label>
              <textarea
                value={topicQuestion2}
                onChange={(e) => setTopicQuestion2(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:ring-4 focus:ring-orange-100 transition-all resize-none"
                rows="4"
                placeholder="例：地域の未来のために何に投資する？&#10;予算が全て現状維持に使われるのでは、未来がない。では何に投資していくべきか。みんなの意見を教えて！"
              />
            </div>

            {/* 開催期間 */}
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">📅</span>
                <h3 className="text-xl font-bold text-gray-900">開催期間を設定</h3>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-2">開始日</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-2">終了日</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all"
                  />
                </div>
              </div>
              <p className="text-xs text-gray-600 mt-3">
                💡 この期間内に参加者がアイデアを投稿できます
              </p>
            </div>

            {/* ミーティングURL（自動生成） */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">🎥</span>
                <h3 className="text-xl font-bold text-gray-900">ミーティングURL</h3>
              </div>
              <div className="bg-white rounded-xl px-4 py-3 border-2 border-gray-200 text-gray-600 font-mono text-sm">
                {selectedTopicId
                  ? `https://meet.google.com/brainstorm-${selectedTopicId.slice(0, 8)}`
                  : '保存後に自動生成されます'
                }
              </div>
              <p className="text-xs text-gray-600 mt-3">
                💡 お題ごとに固定のGoogle Meet URLが自動生成されます
              </p>
            </div>

            {/* ボタン */}
            <div className="flex gap-4 pt-4">
              <button
                onClick={() => {
                  setStage(STAGES.ROLE_SELECT);
                  setRole(null);
                  setSelectedTopicId(null);
                  setShowOnlyMyTopics(false);
                  // フォームをリセット
                  setTopic('');
                  setTopicDescription('');
                  setTopicGoal('');
                  setTopicQuestion1('');
                  setTopicQuestion2('');
                  setStartDate('');
                  setEndDate('');
                  setUploadedFile(null);
                  setUploadedFileUrl('');
                }}
                className="flex-1 py-4 bg-gray-200 text-gray-700 rounded-xl font-bold text-lg hover:bg-gray-300 transition-all duration-300"
              >
                戻る
              </button>
              <button
                onClick={() => {
                  if (topic && topicDescription && topicGoal && topicQuestion1 && topicQuestion2 && startDate && endDate) {
                    setShowConfirmModal(true);
                  }
                }}
                disabled={!topic || !topicDescription || !topicGoal || !topicQuestion1 || !topicQuestion2 || !startDate || !endDate}
                className="flex-1 py-5 bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-xl hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
              >
                {selectedTopicId ? '更新する' : 'セッションを作成'}
              </button>
            </div>
          </div>

          {/* 確認モーダル */}
          {showConfirmModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fadeIn">
              <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-8">
                  <div className="text-center mb-6">
                    <div className="text-5xl mb-4">📋</div>
                    <h2 className="text-3xl font-bold text-gray-900 mb-2">
                      {selectedTopicId ? 'お題の更新内容を確認' : 'お題の登録内容を確認'}
                    </h2>
                    <p className="text-sm text-gray-600">
                      以下の内容で{selectedTopicId ? '更新' : '登録'}します
                    </p>
                  </div>

                  <div className="bg-gray-50 rounded-2xl p-6 mb-6 space-y-4 text-left">
                    <div>
                      <div className="text-xs font-semibold text-gray-500 mb-1">タイトル</div>
                      <div className="text-lg font-bold text-gray-900">{topic}</div>
                    </div>

                    <div>
                      <div className="text-xs font-semibold text-gray-500 mb-1">概要</div>
                      <div className="text-sm text-gray-700 whitespace-pre-wrap">{topicDescription}</div>
                    </div>

                    <div>
                      <div className="text-xs font-semibold text-gray-500 mb-1">目指したいこと</div>
                      <div className="text-sm text-gray-700 whitespace-pre-wrap">{topicGoal}</div>
                    </div>

                    <div>
                      <div className="text-xs font-semibold text-gray-500 mb-1">問い①</div>
                      <div className="text-sm text-gray-700 whitespace-pre-wrap">{topicQuestion1}</div>
                    </div>

                    <div>
                      <div className="text-xs font-semibold text-gray-500 mb-1">問い②</div>
                      <div className="text-sm text-gray-700 whitespace-pre-wrap">{topicQuestion2}</div>
                    </div>

                    <div>
                      <div className="text-xs font-semibold text-gray-500 mb-1">開催期間</div>
                      <div className="text-sm text-gray-700">{startDate} 〜 {endDate}</div>
                    </div>

                    <div>
                      <div className="text-xs font-semibold text-gray-500 mb-1">参加URL</div>
                      <div className="text-sm text-blue-600 font-mono break-all">
                        {window.location.origin}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        const shareText = `【お題への参加のご案内】

タイトル：${topic}

概要：
${topicDescription}

目指したいこと：
${topicGoal}

問い①：
${topicQuestion1}

問い②：
${topicQuestion2}

開催期間：${startDate} 〜 ${endDate}

参加URL：${window.location.origin}

ぜひご参加ください！`;

                        navigator.clipboard.writeText(shareText).then(() => {
                          alert('📋 内容をクリップボードにコピーしました！');
                        }).catch(() => {
                          alert('コピーに失敗しました。もう一度お試しください。');
                        });
                      }}
                      className="flex-1 py-4 bg-blue-500 text-white rounded-xl font-bold text-lg hover:bg-blue-600 transition-all duration-300 flex items-center justify-center gap-2"
                    >
                      <Copy size={20} />
                      この内容をコピーする
                    </button>

                    <button
                      onClick={async () => {
                        try {
                          if (selectedTopicId) {
                            // 更新モード
                            const generatedMeetUrl = `https://meet.google.com/brainstorm-${selectedTopicId.slice(0, 8)}`;

                            const { error } = await supabase
                              .from('sessions')
                              .update({
                                title: topic,
                                description: topicDescription,
                                goal: topicGoal,
                                question1: topicQuestion1,
                                question2: topicQuestion2,
                                start_date: startDate,
                                end_date: endDate,
                                pdf_url: uploadedFileUrl || null,
                                meet_url: generatedMeetUrl
                              })
                              .eq('id', selectedTopicId);

                            if (error) {
                              console.error('セッション更新エラー:', error);
                              alert('セッションの更新に失敗しました。もう一度お試しください。');
                              return;
                            }

                            alert(`セッションを更新しました！✨`);
                          } else {
                            // 新規作成モード
                            const { data, error } = await supabase
                              .from('sessions')
                              .insert([
                                {
                                  title: topic,
                                  description: topicDescription,
                                  goal: topicGoal,
                                  question1: topicQuestion1,
                                  question2: topicQuestion2,
                                  host_name: currentUser.name,
                                  start_date: startDate,
                                  end_date: endDate,
                                  pdf_url: uploadedFileUrl || null,
                                  meet_url: '', // 後で更新
                                  status: 'upcoming'
                                }
                              ])
                              .select()
                              .single();

                            if (error) {
                              console.error('セッション作成エラー:', error);
                              alert('セッションの作成に失敗しました。もう一度お試しください。');
                              return;
                            }

                            // IDを使ってMeet URLを生成し、更新
                            const generatedMeetUrl = `https://meet.google.com/brainstorm-${data.id.slice(0, 8)}`;
                            await supabase
                              .from('sessions')
                              .update({ meet_url: generatedMeetUrl })
                              .eq('id', data.id);

                            alert(`セッションを作成しました！✨`);
                          }

                          // モーダルを閉じる
                          setShowConfirmModal(false);

                          // トップページに戻る
                          setStage(STAGES.ROLE_SELECT);
                          setShowOnlyMyTopics(false);
                          // フォームをリセット
                          setSelectedTopicId(null);
                          setTopic('');
                          setTopicDescription('');
                          setTopicGoal('');
                          setTopicQuestion1('');
                          setTopicQuestion2('');
                          setStartDate('');
                          setEndDate('');
                          setUploadedFile(null);
                          setUploadedFileUrl('');
                          // お題一覧を再取得
                          fetchSessions();
                        } catch (err) {
                          console.error('予期しないエラー:', err);
                          alert('予期しないエラーが発生しました。');
                        }
                      }}
                      className="flex-1 py-4 bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-xl font-bold text-lg hover:shadow-xl transition-all duration-300"
                    >
                      この内容で登録する
                    </button>
                  </div>

                  <button
                    onClick={() => setShowConfirmModal(false)}
                    className="w-full mt-3 py-3 text-gray-600 hover:text-gray-900 font-semibold transition-all"
                  >
                    キャンセル
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ゲスト用お題選択画面
  if (stage === STAGES.GUEST_SELECT) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50 p-8 animate-fadeIn">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <div className="inline-block px-4 py-2 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold mb-4">
              👥 ゲストモード
            </div>
            <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
              お題を選んで参加
            </h1>
            <p className="text-lg text-gray-700">参加したいセッションを選択してください</p>
          </div>

          {/* あなたの名前入力 */}
          <div className="bg-white rounded-3xl shadow-lg p-6 mb-8">
            <label className="block text-sm font-semibold text-gray-700 mb-3">あなたの名前</label>
            <input
              type="text"
              value={currentUser.name}
              onChange={(e) => setCurrentUser({ ...currentUser, name: e.target.value, id: Date.now().toString() })}
              className="w-full px-6 py-4 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all text-lg"
              placeholder="山田太郎"
            />
          </div>

          {/* お題一覧 */}
          <div className="space-y-4 mb-8">
            {availableTopics.map((topicItem) => (
              <div
                key={topicItem.id}
                onClick={() => {
                  if (currentUser.name) {
                    setSelectedTopicId(topicItem.id);
                    setTopic(topicItem.title);
                    setTopicDescription(topicItem.description);
                    setCurrentSessionMeetUrl(topicItem.meet_url || '');
                  }
                }}
                className={`bg-white rounded-2xl shadow-lg p-6 cursor-pointer transition-all duration-300 ${
                  selectedTopicId === topicItem.id
                    ? 'ring-4 ring-blue-500 shadow-xl scale-[1.02]'
                    : 'hover:shadow-xl hover:scale-[1.01]'
                } ${!currentUser.name ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-2xl font-bold text-gray-900">{topicItem.title}</h3>
                  {selectedTopicId === topicItem.id && (
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white">
                      ✓
                    </div>
                  )}
                </div>
                <p className="text-gray-600 mb-4">{topicItem.description}</p>
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <div className="flex items-center gap-2">
                    <span>🎯</span>
                    <span>ホスト: {topicItem.host_name || topicItem.host || '不明'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>📅</span>
                    <span>
                      {(() => {
                        try {
                          if (topicItem.start_date && topicItem.end_date) {
                            const start = new Date(topicItem.start_date);
                            const end = new Date(topicItem.end_date);
                            const startStr = `${String(start.getMonth() + 1).padStart(2, '0')}/${String(start.getDate()).padStart(2, '0')}`;
                            const endStr = `${String(end.getMonth() + 1).padStart(2, '0')}/${String(end.getDate()).padStart(2, '0')}`;
                            return `${startStr}〜${endStr}`;
                          } else if (topicItem.start_date) {
                            const start = new Date(topicItem.start_date);
                            return `${String(start.getMonth() + 1).padStart(2, '0')}/${String(start.getDate()).padStart(2, '0')}`;
                          } else if (topicItem.created_at) {
                            const created = new Date(topicItem.created_at);
                            return `${String(created.getMonth() + 1).padStart(2, '0')}/${String(created.getDate()).padStart(2, '0')}`;
                          }
                          return '日時未設定';
                        } catch (error) {
                          console.error('日付のパースエラー:', error);
                          return '日時未設定';
                        }
                      })()}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* ボタン */}
          <div className="flex gap-4">
            <button
              onClick={() => {
                setStage(STAGES.ROLE_SELECT);
                setRole(null);
                setSelectedTopicId(null);
              }}
              className="flex-1 py-4 bg-gray-200 text-gray-700 rounded-xl font-bold text-lg hover:bg-gray-300 transition-all duration-300"
            >
              戻る
            </button>
            <button
              onClick={() => {
                if (selectedTopicId && currentUser.name) {
                  setStage(STAGES.BRAINSTORM);
                  setIsTimerActive(true);
                  setTimeRemaining(600);
                }
              }}
              disabled={!selectedTopicId || !currentUser.name}
              className="flex-1 py-5 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-xl hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
            >
              ブレインストーミングを開始
            </button>
          </div>
        </div>
      </div>
    );
  }

  // セットアップ画面（旧バージョン - 念のため残す）
  if (stage === STAGES.SETUP) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 p-8 animate-fadeIn">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-6xl font-bold mb-4 gradient-text">
              集団ブレインストーミング
            </h1>
            <p className="text-xl text-gray-700">AIと共に創造的な議論を</p>
          </div>

          <div className="bg-white rounded-3xl shadow-2xl p-10 space-y-8">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">あなたの名前</label>
              <input
                type="text"
                value={currentUser.name}
                onChange={(e) => setCurrentUser({ ...currentUser, name: e.target.value, id: Date.now().toString() })}
                className="w-full px-6 py-4 border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:ring-4 focus:ring-orange-100 transition-all text-lg"
                placeholder="山田太郎"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">ブレインストーミングのテーマ</label>
              <textarea
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="w-full px-6 py-4 border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:ring-4 focus:ring-orange-100 transition-all text-lg resize-none"
                rows="4"
                placeholder="例：地域コミュニティを活性化する新しい施策について"
              />
            </div>

            <button
              onClick={startBrainstorm}
              disabled={!topic || !currentUser.name}
              className="w-full py-5 bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-xl hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
            >
              ブレインストーミングを開始
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ブレインストーミング画面
  if (stage === STAGES.BRAINSTORM) {
    // お題情報を取得
    const currentTopic = availableTopics.find(t => t.id === selectedTopicId);
    const currentMessages = currentQuestionSection === 'question1' ? messagesQ1 : messagesQ2;

    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 p-6">
        <div className="max-w-6xl mx-auto">
          {/* ヘッダー */}
          <div className="bg-white rounded-3xl shadow-lg p-6 mb-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h2 className="text-3xl font-bold text-gray-900 mb-2">{topic}</h2>
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <Users size={16} />
                    <span>{currentUser.name}</span>
                  </div>
                  <span className="text-gray-400">|</span>
                  <div className="flex items-center gap-1">
                    <span>📅</span>
                    <span>
                      {currentTopic && currentTopic.start_date && currentTopic.end_date ? (
                        (() => {
                          const start = new Date(currentTopic.start_date);
                          const end = new Date(currentTopic.end_date);
                          return `${String(start.getMonth() + 1).padStart(2, '0')}/${String(start.getDate()).padStart(2, '0')}〜${String(end.getMonth() + 1).padStart(2, '0')}/${String(end.getDate()).padStart(2, '0')}`;
                        })()
                      ) : '期間未設定'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Google Meetボタン */}
              <div className="ml-4">
                {currentSessionMeetUrl ? (
                  <a
                    href={currentSessionMeetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-3 rounded-xl font-bold text-sm shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 flex items-center gap-2"
                  >
                    <Video size={20} />
                    <span>Meet参加</span>
                  </a>
                ) : (
                  <button
                    disabled
                    className="bg-gray-400 text-white px-6 py-3 rounded-xl font-bold text-sm shadow-lg flex items-center gap-2 opacity-50 cursor-not-allowed"
                  >
                    <Video size={20} />
                    <span>Meet未設定</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* お題（意図、資料） */}
          <div className="bg-white rounded-3xl shadow-lg p-6 mb-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">お題</h3>
            <p className="text-gray-700 mb-4">{topicDescription}</p>
            {currentTopic && currentTopic.goal && (
              <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl p-4">
                <div className="text-sm font-semibold text-gray-600 mb-2">🎯 目指したいこと</div>
                <div className="text-gray-800">{currentTopic.goal}</div>
              </div>
            )}
          </div>

          {/* 問い①セクション */}
          <div className="bg-white rounded-3xl shadow-lg p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">問い①</h3>
              <button
                onClick={() => setCurrentQuestionSection('question1')}
                className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                  currentQuestionSection === 'question1'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                }`}
              >
                {currentQuestionSection === 'question1' ? '回答中' : '切り替え'}
              </button>
            </div>

            {currentTopic && currentTopic.question1 && (
              <div className="bg-blue-50 rounded-xl p-4 mb-4">
                <p className="text-gray-800">{currentTopic.question1}</p>
              </div>
            )}

            {currentQuestionSection === 'question1' && (
              <>
                {/* AIチャット */}
                <div className="mb-4">
                  <div className="h-64 overflow-y-auto space-y-3 mb-4 pr-2 custom-scrollbar">
                    {messagesQ1.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.type === 'ai' ? 'justify-start' : 'justify-end'} animate-fadeIn`}
                      >
                        <div className={`max-w-[70%] rounded-2xl p-3 ${
                          msg.type === 'ai'
                            ? 'bg-gradient-to-r from-purple-100 to-blue-100 text-gray-900'
                            : 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white'
                        }`}>
                          <div className="font-semibold text-xs mb-1">{msg.userName}</div>
                          <div className="text-sm">{msg.content}</div>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>

                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={currentInput}
                      onChange={(e) => setCurrentInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                      className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                      placeholder="考えを入力..."
                    />
                    <button
                      onClick={sendMessage}
                      className="px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl font-bold hover:shadow-lg hover:scale-105 transition-all"
                    >
                      <Send size={20} />
                    </button>
                  </div>
                </div>

                {/* みんなの意見をみる */}
                <button
                  onClick={() => setShowAllOpinions(!showAllOpinions)}
                  className="w-full py-3 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-xl font-semibold hover:shadow-lg hover:scale-[1.01] transition-all"
                >
                  {showAllOpinions ? '意見を閉じる' : 'みんなの意見をみる'}
                </button>

                {showAllOpinions && (
                  <div className="mt-4 bg-gray-50 rounded-xl p-4 max-h-64 overflow-y-auto">
                    {ideas.filter(idea => idea.questionSection === 'question1').map((idea, idx) => (
                      <div key={idx} className="bg-white rounded-lg p-3 mb-2">
                        <div className="text-xs text-gray-500 mb-1">参加者の意見</div>
                        <div className="text-sm text-gray-800">{idea.content}</div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* 問い②セクション */}
          <div className="bg-white rounded-3xl shadow-lg p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">問い②</h3>
              <button
                onClick={() => setCurrentQuestionSection('question2')}
                className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                  currentQuestionSection === 'question2'
                    ? 'bg-orange-500 text-white'
                    : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                }`}
              >
                {currentQuestionSection === 'question2' ? '回答中' : '切り替え'}
              </button>
            </div>

            {currentTopic && currentTopic.question2 && (
              <div className="bg-orange-50 rounded-xl p-4 mb-4">
                <p className="text-gray-800">{currentTopic.question2}</p>
              </div>
            )}

            {currentQuestionSection === 'question2' && (
              <>
                {/* AIチャット */}
                <div className="mb-4">
                  <div className="h-64 overflow-y-auto space-y-3 mb-4 pr-2 custom-scrollbar">
                    {messagesQ2.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.type === 'ai' ? 'justify-start' : 'justify-end'} animate-fadeIn`}
                      >
                        <div className={`max-w-[70%] rounded-2xl p-3 ${
                          msg.type === 'ai'
                            ? 'bg-gradient-to-r from-purple-100 to-blue-100 text-gray-900'
                            : 'bg-gradient-to-r from-orange-500 to-rose-500 text-white'
                        }`}>
                          <div className="font-semibold text-xs mb-1">{msg.userName}</div>
                          <div className="text-sm">{msg.content}</div>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>

                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={currentInput}
                      onChange={(e) => setCurrentInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                      className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:ring-4 focus:ring-orange-100 transition-all"
                      placeholder="考えを入力..."
                    />
                    <button
                      onClick={sendMessage}
                      className="px-6 py-3 bg-gradient-to-r from-orange-500 to-rose-500 text-white rounded-xl font-bold hover:shadow-lg hover:scale-105 transition-all"
                    >
                      <Send size={20} />
                    </button>
                  </div>
                </div>

                {/* みんなの意見をみる */}
                <button
                  onClick={() => setShowAllOpinions(!showAllOpinions)}
                  className="w-full py-3 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-xl font-semibold hover:shadow-lg hover:scale-[1.01] transition-all"
                >
                  {showAllOpinions ? '意見を閉じる' : 'みんなの意見をみる'}
                </button>

                {showAllOpinions && (
                  <div className="mt-4 bg-gray-50 rounded-xl p-4 max-h-64 overflow-y-auto">
                    {ideas.filter(idea => idea.questionSection === 'question2').map((idea, idx) => (
                      <div key={idx} className="bg-white rounded-lg p-3 mb-2">
                        <div className="text-xs text-gray-500 mb-1">参加者の意見</div>
                        <div className="text-sm text-gray-800">{idea.content}</div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* 解決の方向性セクション */}
          <div className="bg-white rounded-3xl shadow-lg p-6 mb-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">解決の方向性</h3>
            <p className="text-sm text-gray-600 mb-4">みんなの意見から導かれた解決アイディアの軸から、あなたが重要だと思うものを選び、理由を記入してください。</p>

            <div className="space-y-3 mb-4">
              {['方向性A: 地域の交流拠点を増やす', '方向性B: オンラインコミュニティを活性化する', '方向性C: 既存施設の活用を促進する'].map((solution, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedSolution(solution)}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                    selectedSolution === solution
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-semibold text-gray-900">{solution}</div>
                </button>
              ))}
            </div>

            {selectedSolution && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  選んだ理由を教えてください
                </label>
                <textarea
                  value={solutionReason}
                  onChange={(e) => setSolutionReason(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 transition-all resize-none"
                  rows="4"
                  placeholder="なぜこの方向性が重要だと思いますか？"
                />
              </div>
            )}
          </div>

          {/* 終了するボタン */}
          <button
            onClick={() => {
              setStage(STAGES.ROLE_SELECT);
              setMessagesQ1([]);
              setMessagesQ2([]);
              setIdeas([]);
              setSelectedSolution('');
              setSolutionReason('');
            }}
            className="w-full py-4 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-xl hover:scale-[1.01] transition-all"
          >
            終了する
          </button>
        </div>
      </div>
    );
  }

  // AI分析中画面
  if (stage === STAGES.AI_ANALYSIS) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 flex items-center justify-center p-8">
        <div className="text-center animate-fadeIn">
          <Brain size={96} className="text-purple-600 mx-auto mb-8 animate-pulse" />
          <h2 className="text-4xl font-bold mb-4 text-gray-900">AIが分析中...</h2>
          <p className="text-xl text-gray-600">アイデアを整理し、論点を抽出しています</p>
        </div>
      </div>
    );
  }

  // マッピング画面
  if (stage === STAGES.MAPPING) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 p-8">
        <div className="max-w-6xl mx-auto animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl p-10">
            <h2 className="text-4xl font-bold mb-8 bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
              アイデアマッピング
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
              {mappedIdeas?.clusters.map((cluster, idx) => (
                <div key={idx} className="bg-gradient-to-br from-emerald-100 to-teal-100 rounded-2xl p-6">
                  <h3 className="text-2xl font-bold mb-4 text-emerald-900">{cluster.theme}</h3>
                  <p className="text-gray-700 mb-4">{cluster.summary}</p>
                  <div className="space-y-2">
                    {cluster.ideas.map((ideaIdx) => (
                      <div key={ideaIdx} className="bg-white rounded-lg p-3 text-sm">
                        {ideas[ideaIdx]?.content}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-gradient-to-r from-amber-100 to-orange-100 rounded-2xl p-8 mb-8">
              <h3 className="text-2xl font-bold mb-6 text-amber-900">抽出された主要論点</h3>
              <ul className="space-y-3">
                {mappedIdeas?.key_points.map((point, idx) => (
                  <li key={idx} className="flex items-start gap-3 text-lg">
                    <span className="flex-shrink-0 w-8 h-8 bg-amber-600 text-white rounded-full flex items-center justify-center font-bold">
                      {idx + 1}
                    </span>
                    <span className="text-gray-800 pt-1">{point}</span>
                  </li>
                ))}
              </ul>
            </div>

            <button
              onClick={startDiscussion}
              className="w-full py-5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-300"
            >
              ディスカッションを開始
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ディスカッション画面
  if (stage === STAGES.DISCUSSION) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-8">
        <div className="max-w-4xl mx-auto animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl p-10">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                リアルディスカッション
              </h2>
              {/* Google Meetボタン（大きめ） */}
              {currentSessionMeetUrl ? (
                <a
                  href={currentSessionMeetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-8 py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 flex items-center gap-3"
                >
                  <Video size={32} />
                  <div className="text-left">
                    <div>Google Meet</div>
                    <div className="text-xs opacity-90">オンライン会議中</div>
                  </div>
                </a>
              ) : (
                <button 
                  disabled
                  className="bg-gray-400 text-white px-8 py-4 rounded-xl font-bold text-lg shadow-lg flex items-center gap-3 opacity-50 cursor-not-allowed"
                >
                  <Video size={32} />
                  <div className="text-left">
                    <div>Google Meet</div>
                    <div className="text-xs opacity-90">未設定</div>
                  </div>
                </button>
              )}
            </div>

            <div className="bg-gradient-to-r from-purple-100 to-pink-100 rounded-2xl p-8 mb-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <Mic size={48} className={isRecording ? 'text-red-600 animate-pulse' : 'text-gray-600'} />
                  <div>
                    <div className="text-2xl font-bold text-gray-900">
                      {isRecording ? '録音中...' : '録音準備完了'}
                    </div>
                    <div className="text-sm text-gray-600">
                      議論の内容を自動で記録します
                    </div>
                  </div>
                </div>
                
                <button
                  onClick={toggleRecording}
                  className={`px-8 py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all duration-300 ${
                    isRecording
                      ? 'bg-red-600 hover:bg-red-700 text-white'
                      : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white'
                  }`}
                >
                  {isRecording ? <Pause size={24} /> : <Play size={24} />}
                </button>
              </div>

              {transcript && (
                <div className="bg-white rounded-xl p-6 max-h-96 overflow-y-auto custom-scrollbar">
                  <h4 className="font-semibold mb-3 text-gray-900">議事録</h4>
                  <p className="text-gray-700 whitespace-pre-wrap">{transcript}</p>
                </div>
              )}
            </div>

            <button
              onClick={remapIdeas}
              className="w-full py-5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-300"
            >
              ディスカッションを踏まえて再マッピング
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 再マッピング画面
  if (stage === STAGES.REMAP) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-fuchsia-50 p-8">
        <div className="max-w-6xl mx-auto animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl p-10">
            <h2 className="text-4xl font-bold mb-8 bg-gradient-to-r from-rose-600 to-fuchsia-600 bg-clip-text text-transparent">
              ディスカッションを踏まえた再分析
            </h2>

            {mappedIdeas?.new_insights && (
              <div className="bg-gradient-to-r from-rose-100 to-pink-100 rounded-2xl p-8 mb-8">
                <h3 className="text-2xl font-bold mb-6 text-rose-900">ディスカッションから得られた洞察</h3>
                <ul className="space-y-3">
                  {mappedIdeas.new_insights.map((insight, idx) => (
                    <li key={idx} className="flex items-start gap-3 text-lg">
                      <span className="flex-shrink-0 w-8 h-8 bg-rose-600 text-white rounded-full flex items-center justify-center font-bold">
                        {idx + 1}
                      </span>
                      <span className="text-gray-800 pt-1">{insight}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
              {mappedIdeas?.clusters.map((cluster, idx) => (
                <div key={idx} className="bg-gradient-to-br from-pink-100 to-fuchsia-100 rounded-2xl p-6">
                  <h3 className="text-2xl font-bold mb-4 text-fuchsia-900">{cluster.theme}</h3>
                  <p className="text-gray-700 mb-4">{cluster.summary}</p>
                  <div className="space-y-2">
                    {cluster.ideas.map((ideaIdx) => (
                      <div key={ideaIdx} className="bg-white rounded-lg p-3 text-sm">
                        {ideas[ideaIdx]?.content}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-gradient-to-r from-amber-100 to-orange-100 rounded-2xl p-8 mb-8">
              <h3 className="text-2xl font-bold mb-6 text-amber-900">更新された主要論点</h3>
              <ul className="space-y-3">
                {mappedIdeas?.key_points.map((point, idx) => (
                  <li key={idx} className="flex items-start gap-3 text-lg">
                    <span className="flex-shrink-0 w-8 h-8 bg-amber-600 text-white rounded-full flex items-center justify-center font-bold">
                      {idx + 1}
                    </span>
                    <span className="text-gray-800 pt-1">{point}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-gradient-to-r from-green-100 to-emerald-100 rounded-2xl p-8 text-center">
              <h3 className="text-3xl font-bold mb-4 text-green-900">ブレインストーミング完了！</h3>
              <p className="text-xl text-gray-700 mb-6">
                {ideas.length}個のアイデアから{mappedIdeas?.clusters.length}つのテーマが抽出されました
              </p>
              <button
                onClick={() => window.location.reload()}
                className="px-10 py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 inline-flex items-center gap-3"
              >
                <RotateCcw size={24} />
                新しいセッションを開始
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

export default App;
