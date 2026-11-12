'use client';

import React, { useState } from 'react';
import {
  Check,
  Copy,
  ExternalLink,
  MessageCircle,
  MessageSquare,
  Phone,
  Send,
  ShieldAlert,
  X,
} from 'lucide-react';
import { useMarketplace } from '@/context/MarketplaceContext';
import {
  buildTelCallUrl,
  buildWhatsAppContactUrl,
  formatNaira,
} from '@/lib/utils/formatters';

export function ContactSellerModal() {
  const {
    activeContactListing,
    closeContactModal,
    platformMessages,
    sendPlatformMessage,
  } = useMarketplace();

  const [copiedPhone, setCopiedPhone] = useState(false);
  const [contactChannel, setContactChannel] = useState<
    'all' | 'in-platform'
  >('all');
  const [senderName, setSenderName] = useState('Tunde Bakare');
  const [messageText, setMessageText] = useState(
    'Hello, is this still available for physical inspection?'
  );
  const [sentConfirmation, setSentConfirmation] = useState(false);

  if (!activeContactListing) return null;

  const origin =
    typeof window !== 'undefined' ? window.location.origin : 'https://selplase.ng';
  const listingUrl = `${origin}/listings/${activeContactListing.id}`;
  const priceText = formatNaira(activeContactListing.priceNaira);

  const whatsappUrl = buildWhatsAppContactUrl({
    phone: activeContactListing.seller.whatsappPhone,
    recipientName: activeContactListing.seller.fullName,
    itemTitle: activeContactListing.title,
    priceText,
    url: listingUrl,
    mode: 'inquire-listing',
  });

  const telCallUrl = buildTelCallUrl(activeContactListing.seller.whatsappPhone);

  const listingMessages = platformMessages.filter(
    (m) => m.listingId === activeContactListing.id
  );

  const handleCopyPhone = async () => {
    try {
      await navigator.clipboard.writeText(
        activeContactListing.seller.whatsappPhone
      );
      setCopiedPhone(true);
      setTimeout(() => setCopiedPhone(false), 2000);
    } catch {
      setCopiedPhone(true);
      setTimeout(() => setCopiedPhone(false), 2000);
    }
  };

  const handleSendMockMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim()) return;
    sendPlatformMessage({
      listingId: activeContactListing.id,
      listingTitle: activeContactListing.title,
      sellerId: activeContactListing.seller.id,
      sellerName: activeContactListing.seller.fullName,
      senderName,
      messageText,
    });
    setMessageText('');
    setSentConfirmation(true);
    setTimeout(() => setSentConfirmation(false), 3000);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="contact-seller-modal-title"
    >
      <div className="w-full max-w-lg rounded-3xl bg-white/95 backdrop-blur-2xl border border-white/80 shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-2xl text-white font-bold text-sm flex items-center justify-center shrink-0"
              style={{
                backgroundColor: activeContactListing.seller.avatarColor,
              }}
            >
              {activeContactListing.seller.initials}
            </div>
            <div>
              <h2
                id="contact-seller-modal-title"
                className="text-base font-bold text-slate-900"
              >
                Contact {activeContactListing.seller.fullName}
              </h2>
              <p className="text-xs text-slate-500">
                {activeContactListing.seller.responseTime}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={closeContactModal}
            aria-label="Close contact seller modal"
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Listing Context */}
        <div className="mt-4 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
          <p className="text-xs text-slate-500">
            Inquiring about {activeContactListing.type}
          </p>
          <p className="text-sm font-semibold text-slate-900 mt-0.5 line-clamp-1">
            {activeContactListing.title}
          </p>
          <p className="text-sm font-bold text-blue-600 font-mono mt-1">
            {priceText} · {activeContactListing.area}, {activeContactListing.state}
          </p>
        </div>

        {/* 3 Contact Channels: WhatsApp, Call, or In-Platform Message */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="py-2.5 px-3 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs transition-colors whitespace-nowrap"
          >
            <MessageCircle className="w-4 h-4" />
            WhatsApp
            <ExternalLink className="w-3 h-3 opacity-80" />
          </a>

          <a
            href={telCallUrl}
            className="py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs transition-colors whitespace-nowrap"
          >
            <Phone className="w-3.5 h-3.5" />
            Call Seller
          </a>

          <button
            type="button"
            onClick={() =>
              setContactChannel((prev) =>
                prev === 'in-platform' ? 'all' : 'in-platform'
              )
            }
            className={`py-2.5 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
              contactChannel === 'in-platform'
                ? 'bg-blue-600 border-blue-600 text-white'
                : 'bg-blue-50/80 hover:bg-blue-100/80 border-blue-200 text-blue-700'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            In-Platform Chat
          </button>
        </div>

        {/* Direct Phone Number + Copy */}
        <div className="mt-3.5 flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200/70">
          <div className="flex items-center gap-2.5">
            <Phone className="w-4 h-4 text-blue-600" />
            <div>
              <p className="text-[11px] text-slate-500">
                Seller Phone &amp; WhatsApp (Demo)
              </p>
              <p className="text-xs font-mono font-bold text-slate-900">
                {activeContactListing.seller.whatsappPhone}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleCopyPhone}
            className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-xs font-medium text-slate-700 flex items-center gap-1 transition-colors cursor-pointer"
          >
            {copiedPhone ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                Copied
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                Copy Number
              </>
            )}
          </button>
        </div>

        {/* Mocked In-Platform Message Composer & Thread */}
        <div className="mt-4 rounded-2xl bg-blue-50/50 border border-blue-200/80 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
              In-Platform Message (Mocked Stage 1 Preview)
            </span>
            <span className="text-[11px] text-slate-500">
              {listingMessages.length} sent
            </span>
          </div>

          {/* Quick Inquiry Presets */}
          <div className="flex flex-wrap gap-1.5">
            {[
              'Is this still available?',
              'Can I inspect it today?',
              'What is your last price in Naira?',
            ].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setMessageText(preset)}
                className="px-2.5 py-1 rounded-lg bg-white hover:bg-blue-50 border border-slate-200 text-[11px] font-medium text-slate-700 transition-colors cursor-pointer"
              >
                {preset}
              </button>
            ))}
          </div>

          <form onSubmit={handleSendMockMessage} className="space-y-2.5">
            <div>
              <label htmlFor="contact-sender-name" className="sr-only">
                Your Name
              </label>
              <input
                id="contact-sender-name"
                type="text"
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                placeholder="Your name"
                className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-blue-600"
              />
            </div>

            <div className="flex items-center gap-2">
              <label htmlFor="contact-message-input" className="sr-only">
                Write a message to seller
              </label>
              <input
                id="contact-message-input"
                type="text"
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder="Type an in-platform message to the seller..."
                className="flex-1 px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-blue-600"
              />
              <button
                type="submit"
                className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
                Send
              </button>
            </div>
          </form>

          {sentConfirmation && (
            <p className="text-xs font-semibold text-emerald-700">
              Saved to local browser preview only (not sent to other users yet).
            </p>
          )}

          {listingMessages.length > 0 && (
            <div className="pt-2 border-t border-blue-100 space-y-2 max-h-36 overflow-y-auto">
              {listingMessages.map((msg) => (
                <div
                  key={msg.id}
                  className="rounded-xl bg-white p-2.5 border border-slate-200/80 text-xs space-y-1"
                >
                  <p className="font-semibold text-slate-900">
                    {msg.senderName}:{' '}
                    <span className="font-normal text-slate-700">
                      {msg.messageText}
                    </span>
                  </p>
                  <p className="text-[11px] text-blue-700 bg-blue-50/70 rounded-lg px-2 py-1">
                    {msg.replyPreview}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Safety Advisory */}
        <div className="mt-4 p-3 rounded-2xl bg-amber-50/80 border border-amber-200/80 flex items-start gap-2.5 text-xs text-amber-900">
          <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-amber-800/90 leading-relaxed">
            <strong>Selplase Safety Reminder:</strong> Meet the seller in an open
            public location to inspect the item before transferring funds.
          </p>
        </div>
      </div>
    </div>
  );
}
