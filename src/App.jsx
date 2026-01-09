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

function App() {
  const [stage, setStage] = useState(STAGES.ROLE_SELECT);
  const [hostPassword, setHostPassword] = useState('');
  const [passwordAttempt, setPasswordAttempt] = useState('');
  const [selectedTopicForHostLogin, setSelectedTopicForHostLogin] = useState(null);
  const [role, setRole] = useState(null);
  const [topic, setTopic] = useState('');
  const [topicDescription, setTopicDescription] = useState('');
  const [topicBackground, setTopicBackground] = useState('');
  const [topicCurrentSituation, setTopicCurrentSituation] = useState('');
  const [topicChallenge, setTopicChallenge] = useState('');
  const [uploadedFile, setUploadedFile] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [availableTopics, setAvailableTopics] = useState([]);
  const [isLoadingTopics, setIsLoadingTopics] = useState(true);
  const [selectedTopicId, setSelectedTopicId] = useState(null);
  const [currentUser, setCurrentUser] = useState({ id: '', name: '' });
  const [currentParticipantId, setCurrentParticipantId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [ideas, setIdeas] = useState([]);
  const [timeRemaining, setTimeRemaining] = useState(600);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [mappedIdeas, setMappedIdeas] = useState(null);
  const [currentInput, setCurrentInput] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
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
        .order('scheduled_date', { ascending: true });

      if (error) {
        console.error('Supabaseからのデータ取得エラー:', error);
        // エラー時はダミーデータを表示
        setAvailableTopics([
          { id: '1', title: '地域コミュニティの活性化', description: '地域住民が交流できる新しい仕組みを考えます', host_name: '山田太郎', created_at: new Date().toISOString() },
          { id: '2', title: '教育現場でのAI活用', description: '学校や教育機関でAIを効果的に使う方法', host_name: '佐藤花子', created_at: new Date().toISOString() },
          { id: '3', title: '環境に優しい生活習慣', description: 'サステナブルな暮らし方のアイデア', host_name: '鈴木一郎', created_at: new Date().toISOString() }
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

    setMessages((prev) => [...prev, userMessage]);
    setIdeas((prev) => [...prev, { userId: currentUser.id, content: currentInput }]);
    
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
              content: ideaContent
            }
          ]);
      } catch (error) {
        console.error('アイデア保存エラー:', error);
      }
    }

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          messages: [{
            role: 'user',
            content: `テーマ「${topic}」に対して、参加者が以下のアイデアを出しました：
「${currentInput}」

このアイデアの背景にある考えや、さらに広がる可能性について、1つ質問してください。質問は簡潔に、1〜2文で。`
          }]
        })
      });

      const data = await response.json();
      const aiQuestion = data.content[0].text;

      const aiMessage = {
        id: Date.now() + 1,
        userId: 'ai',
        userName: 'AIファシリテーター',
        content: aiQuestion,
        timestamp: new Date(),
        type: 'ai'
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      console.error('AI質問生成エラー:', error);
      const errorMessage = {
        id: Date.now() + 1,
        userId: 'ai',
        userName: 'AIファシリテーター',
        content: 'それは興味深いアイデアですね。もう少し詳しく教えていただけますか？',
        timestamp: new Date(),
        type: 'ai'
      };
      setMessages((prev) => [...prev, errorMessage]);
    }
  };

  const handleStageComplete = async () => {
    setIsTimerActive(false);
    setStage(STAGES.AI_ANALYSIS);
    setIsAnalyzing(true);

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 4000,
          messages: [{
            role: 'user',
            content: `テーマ「${topic}」について、以下のアイデアが出されました：

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
        })
      });

      const data = await response.json();
      const analysisText = data.content[0].text;
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
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 4000,
          messages: [{
            role: 'user',
            content: `元のテーマ「${topic}」に対する初期アイデア：
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
        })
      });

      const data = await response.json();
      const analysisText = data.content[0].text;
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
          <div className="text-center mb-12">
            <h1 className="text-6xl font-bold mb-4 gradient-text">
              集団ブレインストーミング
            </h1>
            <p className="text-xl text-gray-700">AIと共に創造的な議論を</p>
          </div>

          {/* お題一覧セクション */}
          <div className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-3xl font-bold text-gray-900">📋 開催予定のお題</h2>
              <span className="text-sm text-gray-500">{availableTopics.length}件のお題</span>
            </div>
            
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              {isLoadingTopics ? (
                // ローディング表示
                <div className="col-span-3 text-center py-12">
                  <div className="inline-block w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                  <p className="text-gray-600">お題を読み込み中...</p>
                </div>
              ) : availableTopics.length === 0 ? (
                // データがない場合
                <div className="col-span-3 text-center py-12 bg-white rounded-2xl">
                  <div className="text-6xl mb-4">📋</div>
                  <p className="text-xl text-gray-700 mb-2">まだお題がありません</p>
                  <p className="text-sm text-gray-500">ホストとして最初のお題を作成しましょう！</p>
                </div>
              ) : (
                availableTopics.map((topicItem) => {
                  const displayDate = topicItem.scheduled_date 
                    ? new Date(topicItem.scheduled_date).toLocaleDateString('ja-JP')
                    : new Date(topicItem.created_at).toLocaleDateString('ja-JP');
                  
                  return (
                    <div
                      key={topicItem.id}
                      className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all duration-300"
                    >
                      <div className="mb-4">
                        <div className="text-xs text-orange-600 font-semibold mb-2">📅 {displayDate}</div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">{topicItem.title}</h3>
                        <p className="text-sm text-gray-600 line-clamp-2">{topicItem.description}</p>
                      </div>
                      
                      <div className="pt-4 border-t border-gray-100 space-y-3">
                        {/* ホスト名（クリック可能） */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTopicForHostLogin(topicItem);
                            setStage('host_password');
                          }}
                          className="flex items-center gap-2 text-sm text-gray-600 hover:text-orange-600 transition-colors group"
                        >
                          <span>🎯</span>
                          <span className="group-hover:underline">{topicItem.host_name}</span>
                          <span className="text-xs text-gray-400 group-hover:text-orange-400">（ホストでログイン）</span>
                        </button>

                        {/* ゲスト参加ボタン */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setRole(ROLES.GUEST);
                            setSelectedTopicId(topicItem.id);
                            setTopic(topicItem.title);
                            setTopicDescription(topicItem.description);
                            setStage(STAGES.GUEST_SELECT);
                          }}
                          className="w-full py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl font-semibold hover:shadow-lg hover:scale-[1.02] transition-all duration-300 flex items-center justify-center gap-2"
                        >
                          <span>👥</span>
                          <span>参加する</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* アクションボタンセクション */}
          <div className="grid md:grid-cols-3 gap-6">
            {/* ゲスト参加ボタン */}
            <button
              onClick={() => {
                setRole(ROLES.GUEST);
                setStage(STAGES.GUEST_SELECT);
              }}
              className="bg-white rounded-2xl shadow-lg p-8 hover:shadow-xl hover:scale-[1.02] transition-all duration-300 group"
            >
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-blue-400 to-cyan-500 rounded-full flex items-center justify-center text-white text-3xl group-hover:scale-110 transition-transform">
                  👥
                </div>
                <h3 className="text-xl font-bold mb-2 text-gray-900">ゲストで参加</h3>
                <p className="text-sm text-gray-600">お題を選んで参加</p>
              </div>
            </button>

            {/* ホスト作成ボタン */}
            <button
              onClick={() => {
                setRole(ROLES.HOST);
                setStage(STAGES.HOST_SETUP);
              }}
              className="bg-white rounded-2xl shadow-lg p-8 hover:shadow-xl hover:scale-[1.02] transition-all duration-300 group"
            >
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center text-white text-3xl group-hover:scale-110 transition-transform">
                  🎯
                </div>
                <h3 className="text-xl font-bold mb-2 text-gray-900">ホストでお題作成</h3>
                <p className="text-sm text-gray-600">新しいセッションを作成</p>
              </div>
            </button>

            {/* 事務局ログインボタン */}
            <button
              onClick={() => {
                alert('事務局ログイン機能は今後実装予定です');
              }}
              className="bg-white rounded-2xl shadow-lg p-8 hover:shadow-xl hover:scale-[1.02] transition-all duration-300 group border-2 border-gray-200"
            >
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-gray-400 to-gray-600 rounded-full flex items-center justify-center text-white text-3xl group-hover:scale-110 transition-transform">
                  🔐
                </div>
                <h3 className="text-xl font-bold mb-2 text-gray-900">事務局ログイン</h3>
                <p className="text-sm text-gray-600">管理者専用</p>
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
            <p className="text-lg text-gray-700">お題を設定してセッションを開始しましょう</p>
          </div>

          <div className="bg-white rounded-3xl shadow-2xl p-10 space-y-8">
            {/* ホスト名 */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">あなたの名前（ホスト名）</label>
              <input
                type="text"
                value={currentUser.name}
                onChange={(e) => setCurrentUser({ ...currentUser, name: e.target.value, id: Date.now().toString() })}
                className="w-full px-6 py-4 border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:ring-4 focus:ring-orange-100 transition-all text-lg"
                placeholder="山田太郎"
              />
            </div>

            {/* ホストパスワード設定 */}
            <div className="bg-orange-50 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">🔒</span>
                <h3 className="text-lg font-bold text-gray-900">ホストパスワード設定</h3>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">パスワード</label>
                <input
                  type="password"
                  value={hostPassword}
                  onChange={(e) => setHostPassword(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:ring-4 focus:ring-orange-100 transition-all"
                  placeholder="後でホストとしてログインするためのパスワード"
                />
                <p className="text-xs text-gray-600 mt-2">
                  💡 このパスワードで後からセッションに戻れます
                </p>
              </div>
            </div>

            {/* テーマ */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">テーマ（タイトル）</label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="w-full px-6 py-4 border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:ring-4 focus:ring-orange-100 transition-all text-lg"
                placeholder="例：地域コミュニティを活性化する新しい施策"
              />
            </div>

            {/* 補足情報（テンプレート） */}
            <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl p-6 space-y-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">📝</span>
                <h3 className="text-xl font-bold text-gray-900">補足情報（テンプレート）</h3>
              </div>
              
              {/* 背景 */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">背景</label>
                <textarea
                  value={topicBackground}
                  onChange={(e) => setTopicBackground(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:ring-4 focus:ring-orange-100 transition-all resize-none"
                  rows="3"
                  placeholder="このテーマが生まれた背景や経緯を記入してください"
                />
              </div>

              {/* 現状 */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">現状</label>
                <textarea
                  value={topicCurrentSituation}
                  onChange={(e) => setTopicCurrentSituation(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:ring-4 focus:ring-orange-100 transition-all resize-none"
                  rows="3"
                  placeholder="現在の状況や取り組んでいることを記入してください"
                />
              </div>

              {/* 課題 */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">課題</label>
                <textarea
                  value={topicChallenge}
                  onChange={(e) => setTopicChallenge(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:ring-4 focus:ring-orange-100 transition-all resize-none"
                  rows="3"
                  placeholder="解決したい課題や問題点を記入してください"
                />
              </div>
            </div>

            {/* PDF資料アップロード */}
            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">📎</span>
                <h3 className="text-xl font-bold text-gray-900">資料PDF（オプション）</h3>
              </div>
              <div className="border-2 border-dashed border-blue-300 rounded-xl p-8 text-center hover:border-blue-500 transition-colors">
                <input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => setUploadedFile(e.target.files[0])}
                  className="hidden"
                  id="pdf-upload"
                />
                <label htmlFor="pdf-upload" className="cursor-pointer">
                  {uploadedFile ? (
                    <div className="text-green-600">
                      <div className="text-4xl mb-2">✓</div>
                      <div className="font-semibold">{uploadedFile.name}</div>
                      <div className="text-sm text-gray-600 mt-1">クリックで変更</div>
                    </div>
                  ) : (
                    <div className="text-gray-600">
                      <div className="text-4xl mb-2">☁️</div>
                      <div className="font-semibold mb-1">PDFファイルをアップロード</div>
                      <div className="text-sm">Google Driveに保存されます</div>
                    </div>
                  )}
                </label>
              </div>
            </div>

            {/* 日程選択 */}
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">📅</span>
                <h3 className="text-xl font-bold text-gray-900">開催日時を選択</h3>
                <span className="text-sm text-gray-600 ml-2">毎週木曜 12:00-13:00</span>
              </div>
              <div className="grid md:grid-cols-3 gap-3 max-h-80 overflow-y-auto custom-scrollbar">
                {thursdaySchedule.map((schedule) => (
                  <button
                    key={schedule.iso}
                    onClick={() => setSelectedDate(schedule.iso)}
                    className={`p-4 rounded-xl text-left transition-all ${
                      selectedDate === schedule.iso
                        ? 'bg-orange-500 text-white shadow-lg scale-105'
                        : 'bg-white hover:bg-orange-50 border-2 border-gray-200 hover:border-orange-300'
                    }`}
                  >
                    <div className={`text-xs mb-1 ${selectedDate === schedule.iso ? 'text-orange-100' : 'text-gray-500'}`}>
                      {schedule.date.toLocaleDateString('ja-JP', { year: 'numeric' })}
                    </div>
                    <div className="font-bold">{schedule.formatted}</div>
                    <div className={`text-sm mt-1 ${selectedDate === schedule.iso ? 'text-orange-100' : 'text-gray-600'}`}>
                      12:00-13:00
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* ボタン */}
            <div className="flex gap-4 pt-4">
              <button
                onClick={() => {
                  setStage(STAGES.ROLE_SELECT);
                  setRole(null);
                }}
                className="flex-1 py-4 bg-gray-200 text-gray-700 rounded-xl font-bold text-lg hover:bg-gray-300 transition-all duration-300"
              >
                戻る
              </button>
              <button
                onClick={async () => {
                  if (topic && currentUser.name && hostPassword && topicBackground && topicCurrentSituation && topicChallenge && selectedDate) {
                    try {
                      // Supabaseにセッションを保存
                      const { data, error } = await supabase
                        .from('sessions')
                        .insert([
                          {
                            title: topic,
                            description: `背景: ${topicBackground}\n現状: ${topicCurrentSituation}\n課題: ${topicChallenge}`,
                            background: topicBackground,
                            current_situation: topicCurrentSituation,
                            challenge: topicChallenge,
                            host_name: currentUser.name,
                            host_password_hash: hostPassword, // 将来はハッシュ化
                            scheduled_date: selectedDate,
                            pdf_url: uploadedFile ? uploadedFile.name : null,
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

                      alert(`セッションを作成しました！✨\n\nタイトル: ${topic}\n日時: ${selectedDate}\n${uploadedFile ? `資料: ${uploadedFile.name}\n` : ''}セッションID: ${data.id}`);
                      
                      // トップページに戻る
                      setStage(STAGES.ROLE_SELECT);
                      // フォームをリセット
                      setTopic('');
                      setTopicBackground('');
                      setTopicCurrentSituation('');
                      setTopicChallenge('');
                      setHostPassword('');
                      setSelectedDate(null);
                      setUploadedFile(null);
                      // お題一覧を再取得
                      fetchSessions();
                    } catch (err) {
                      console.error('予期しないエラー:', err);
                      alert('予期しないエラーが発生しました。');
                    }
                  }
                }}
                disabled={!topic || !currentUser.name || !hostPassword || !topicBackground || !topicCurrentSituation || !topicChallenge || !selectedDate}
                className="flex-1 py-5 bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-xl hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
              >
                作成してMeet URLを生成
              </button>
            </div>
          </div>
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
                    <span>ホスト: {topicItem.host}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>📅</span>
                    <span>{topicItem.createdAt.toLocaleDateString('ja-JP')}</span>
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
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 p-6">
        <div className="max-w-6xl mx-auto">
          {/* セッション情報バー */}
          <div className="bg-white rounded-3xl shadow-lg p-6 mb-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              {/* 左側: お題と役割 */}
              <div className="flex-1 min-w-[300px]">
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-3xl font-bold text-gray-900">{topic}</h2>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    role === ROLES.HOST 
                      ? 'bg-orange-100 text-orange-800' 
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {role === ROLES.HOST ? '🎯 ホスト' : '👥 ゲスト'}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <Users size={16} />
                    <span>{currentUser.name}</span>
                  </div>
                  {topicDescription && (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400">|</span>
                      <span className="truncate max-w-xs">{topicDescription}</span>
                    </div>
                  )}
                </div>
              </div>
              
              {/* 中央: 参加者とGoogle Meet */}
              <div className="flex items-center gap-4">
                {/* 参加者リスト（将来のリアルタイム同期用） */}
                <div className="bg-gray-50 rounded-xl px-4 py-3">
                  <div className="text-xs text-gray-500 mb-1">参加者</div>
                  <div className="flex items-center gap-2">
                    <div className="flex -space-x-2">
                      <div className="w-8 h-8 rounded-full bg-orange-400 border-2 border-white flex items-center justify-center text-white text-xs font-bold">
                        {currentUser.name.charAt(0)}
                      </div>
                      {/* 他の参加者のアバター（将来実装） */}
                      <div className="w-8 h-8 rounded-full bg-blue-400 border-2 border-white flex items-center justify-center text-white text-xs font-bold opacity-50">
                        +
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-gray-700">1人</span>
                  </div>
                </div>

                {/* Google Meetボタン */}
                <button className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-3 rounded-xl font-bold text-sm shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 flex items-center gap-2">
                  <Video size={20} />
                  <span>Meet参加</span>
                </button>
              </div>

              {/* 右側: タイマー */}
              <div className="text-center bg-gradient-to-br from-orange-50 to-rose-50 rounded-xl px-6 py-3">
                <div className="text-4xl font-bold text-orange-600">{formatTime(timeRemaining)}</div>
                <div className="text-xs text-gray-600 mt-1">残り時間</div>
              </div>
            </div>

            {/* セッション共有バー（ホストのみ表示） */}
            {role === ROLES.HOST && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-center gap-4">
                  <div className="flex-1 bg-gray-50 rounded-lg px-4 py-2 font-mono text-sm text-gray-600">
                    セッションID: SESSION-{Date.now().toString().slice(-6)}
                  </div>
                  <button className="px-4 py-2 bg-orange-100 text-orange-700 rounded-lg font-semibold text-sm hover:bg-orange-200 transition-all flex items-center gap-2">
                    <Copy size={16} />
                    招待リンクをコピー
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-3xl shadow-lg p-6 mb-6" style={{ height: 'calc(100vh - 400px)' }}>
            <div className="h-full overflow-y-auto space-y-4 pr-4 custom-scrollbar">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.type === 'ai' ? 'justify-start' : 'justify-end'} animate-fadeIn`}
                >
                  <div className={`max-w-[70%] rounded-2xl p-4 ${
                    msg.type === 'ai'
                      ? 'bg-gradient-to-r from-purple-100 to-blue-100 text-gray-900'
                      : 'bg-gradient-to-r from-orange-500 to-rose-500 text-white'
                  }`}>
                    <div className="font-semibold text-sm mb-1">{msg.userName}</div>
                    <div className="text-base">{msg.content}</div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-lg p-6">
            <div className="flex gap-4 mb-4">
              <input
                type="text"
                value={currentInput}
                onChange={(e) => setCurrentInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                className="flex-1 px-6 py-4 border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:ring-4 focus:ring-orange-100 transition-all text-lg"
                placeholder="アイデアを入力..."
              />
              <button
                onClick={sendMessage}
                className="px-8 py-4 bg-gradient-to-r from-orange-500 to-rose-500 text-white rounded-xl font-bold hover:shadow-xl hover:scale-105 transition-all duration-300"
              >
                <Send size={24} />
              </button>
            </div>
            {ideas.length > 0 && (
              <button
                onClick={() => {
                  setIsTimerActive(false);
                  handleStageComplete();
                }}
                className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl font-semibold text-base shadow-md hover:shadow-lg hover:scale-[1.01] transition-all duration-300"
              >
                アイデアが揃ったので分析を開始する（{ideas.length}個のアイデア）
              </button>
            )}
          </div>
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
              <button className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-8 py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 flex items-center gap-3">
                <Video size={32} />
                <div className="text-left">
                  <div>Google Meet</div>
                  <div className="text-xs opacity-90">オンライン会議中</div>
                </div>
              </button>
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
