import React from 'react';
import { ArrowLeft, MessageCircle, ChevronDown, ChevronUp } from 'lucide-react';

interface SupportScreenProps {
  onBack: () => void;
}

export const SupportScreen: React.FC<SupportScreenProps> = ({ onBack }) => {
  const [expandedFaq, setExpandedFaq] = React.useState<number | null>(null);

  const handleContactSupport = (method: string) => {
    switch (method) {
      case 'telegram':
        window.open('https://t.me/gramvpn_support', '_blank');
        break;
      case 'email':
        window.open('mailto:support@gramvpn.com', '_blank');
        break;
      case 'phone':
        window.open('tel:+74951234567', '_blank');
        break;
    }
  };

  const toggleFaq = (index: number) => {
    setExpandedFaq(expandedFaq === index ? null : index);
  };

  const faqItems = [
    {
      question: "Как настроить VPN на моем устройстве?",
      answer: "После оплаты вы получите подробную инструкцию по настройке для вашего устройства. Поддерживаются все популярные платформы: Windows, Mac, iOS, Android. Настройка занимает не более 2-3 минут."
    },
    {
      question: "Можно ли использовать на нескольких устройствах?",
      answer: "Да, одна подписка позволяет подключить до 5 устройств одновременно. Вы можете использовать VPN на телефоне, компьютере, планшете и других устройствах без дополнительной платы."
    },
    {
      question: "Есть ли гарантия возврата средств?",
      answer: "Мы предоставляем 30-дневную гарантию возврата средств, если сервис вам не подойдет. Просто свяжитесь с поддержкой, и мы вернем деньги без лишних вопросов."
    },
    {
      question: "В каких странах работает VPN?",
      answer: "У нас есть серверы в 50+ странах мира, включая США, Европу, Азию и другие регионы. Полный список доступных локаций вы увидите после подключения в приложении."
    },
    {
      question: "Влияет ли VPN на скорость интернета?",
      answer: "Наши серверы оптимизированы для максимальной скорости. В большинстве случаев снижение скорости минимально (5-10%). Для стриминга и обычного использования интернета это практически незаметно."
    },
    {
      question: "Безопасно ли использовать ваш VPN?",
      answer: "Да, мы используем военное шифрование AES-256 и не ведем логи активности пользователей. Ваши данные полностью защищены и анонимны. Мы работаем по принципу zero-logs policy."
    }
  ];

  return (
    <div className="screen active">
      <button className="back-button" onClick={onBack}>
        <ArrowLeft size={20} />
      </button>
      
      <div className="header" style={{ marginTop: '40px' }}>
        <h1>Поддержка</h1>
        <p>Мы всегда готовы помочь вам</p>
      </div>

      <div className="support-methods">
        <div className="support-card" onClick={() => handleContactSupport('telegram')}>
          <div className="support-icon">
            <MessageCircle size={24} />
          </div>
          <div className="support-content">
            <h3>Telegram чат</h3>
            <p>Быстрая помощь в мессенджере</p>
            <span className="support-status online">● Онлайн</span>
          </div>
        </div>
      </div>

      <div className="faq-section">
        <h3>Частые вопросы</h3>
        
        {faqItems.map((item, index) => (
          <div key={index} className="faq-item">
            <div className="faq-question" onClick={() => toggleFaq(index)}>
              <h4>{item.question}</h4>
              {expandedFaq === index ? (
                <ChevronUp size={20} className="faq-icon" />
              ) : (
                <ChevronDown size={20} className="faq-icon" />
              )}
            </div>
            {expandedFaq === index && (
              <div className="faq-answer">
                <p>{item.answer}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};