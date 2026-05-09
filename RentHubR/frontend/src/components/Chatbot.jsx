import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import './Chatbot.css';
import chatbotImg from '../assets/chatbot_styled.png';

const INITIAL_OPTIONS = [
    "Account and Login",
    "Rent a Vehicle",
    "Booking Status",
    "Cancel Booking",
    "Weather & Packing Tips",
    "Something else"
];

const Chatbot = ({ isOpen, onClose }) => {
    const [messages, setMessages] = useState([
        {
            id: 1,
            text: "Hello! I'm RentHub Support. How can I help you today?",
            sender: 'bot',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            options: INITIAL_OPTIONS
        }
    ]);
    const [inputValue, setInputValue] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        if (isOpen) {
            scrollToBottom();
        }
    }, [messages, isOpen]);

    const handleSend = async (manualText = null) => {
        const textToSend = manualText || inputValue;
        if (!textToSend.trim()) return;

        const newUserMessage = {
            id: Date.now(),
            text: textToSend,
            sender: 'user',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        // Update messages with user's input immediately
        setMessages(prev => [...prev, newUserMessage]);
        setInputValue("");
        setIsTyping(true);

        // --- LOCAL PREDEFINED LOGIC ---
        // This simulates instant responses for the "Chips" before hitting the heavy AI
        const lowerText = textToSend.toLowerCase();
        let localResponse = null;
        let localOptions = null;

        // 1. Handle "Forgot Password" - Explicit Redirect
        if (lowerText === "forgot password" || lowerText === "reset password") {
            setTimeout(() => {
                setMessages(prev => [...prev, {
                    id: Date.now() + 1,
                    text: "I can help with that. Redirecting you to the password reset page...",
                    sender: 'bot',
                    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                }]);
                setTimeout(() => window.location.href = '/forgot-password', 1500);
            }, 500);
            setIsTyping(false);
            return;
        }

        // 2. Handle "My Profile" - Explicit Redirect
        if (lowerText === "my profile") {
            const token = localStorage.getItem('token');
            if (token) {
                setTimeout(() => {
                    setMessages(prev => [...prev, {
                        id: Date.now() + 1,
                        text: "Great! Taking you to your profile now.",
                        sender: 'bot',
                        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    }]);
                    setTimeout(() => window.location.href = '/profile', 1000);
                }, 500);
            } else {
                setTimeout(() => {
                    setMessages(prev => [...prev, {
                        id: Date.now() + 1,
                        text: "You need to log in to view your profile. I'll take you to the login page, and you'll be redirected back automatically.",
                        sender: 'bot',
                        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    }]);
                    setTimeout(() => window.location.href = '/login?redirect=/profile', 1500);
                }, 500);
            }
            setIsTyping(false);
            return;
        }

        // 3. BYPASS: "Create Account" should go to AI, NOT local logic
        // 3. BYPASS: "Create Account" should go to AI, NOT local logic
        if (lowerText === "create account" || lowerText === "register") {
            // Do nothing here, allowing it to fall through to the backend API call below
        }
        else if (lowerText.includes("account") || lowerText.includes("login")) {
            localResponse = "For account related queries, please select one of the options below:";
            localOptions = ["Forgot Password", "My Profile", "Create Account", "Go back"];
        } else if (lowerText === "rent a vehicle" || lowerText === "rent a bike") {
            localResponse = "We have a great collection! Which type of vehicle are you looking for?";
            localOptions = ["Show Bikes", "Show Cars", "Show Scooty", "Go back"];
        } else if (lowerText === "show bikes" || lowerText === "bikes") {
            localResponse = "Here are some of our popular bikes:";
            localOptions = ["Yamaha R15 V3", "Royal Enfield Classic 350", "KTM Duke 200", "Bajaj Pulsar 150", "Apache RTR 160", "Go back"];
        } else if (lowerText === "show cars" || lowerText === "cars") {
            localResponse = "Comfortable cars for your journey:";
            localOptions = ["Swift Dzire", "Honda City", "Mahindra Thar", "Hyundai Creta", "Tata Nexon", "Go back"];
        } else if (lowerText === "show scooty" || lowerText === "scooty") {
            localResponse = "Easy-to-ride scooters for city commute:";
            localOptions = ["Honda Activa 6G", "TVS Jupiter", "Suzuki Access", "Yamaha Fascino", "Hero Pleasure", "Go back"];
        } else if (lowerText === "booking status" || lowerText === "check booking") {
            localResponse = "To check your status, please provide your **Booking ID** (e.g., RH...).";
            localOptions = ["Go back"];
        } else if (lowerText.includes("return") || lowerText.includes("exchange")) {
            localResponse = "You can return your vehicle at any authorized RentHub station. Are you facing an issue with a return?";
            localOptions = ["Station Locations", "Overdue Charges", "Go back"];
        } else if (lowerText === "cancel booking" || lowerText.includes("cancel booking")) {
            localResponse = "To cancel your booking, please provide your **Booking ID** (e.g., RH...).";
            localOptions = ["Go back"];
        } else if (lowerText === "weather & packing tips" || lowerText.includes("weather") || lowerText.includes("packing")) {
            localResponse = "I can help you check the weather and suggest what to pack! 🌤️\n\nPlease tell me your **destination location** (e.g., Mumbai, Goa, Delhi).";
            localOptions = ["Go back"];
        } else if (lowerText === "something else") {
            setTimeout(() => {
                setMessages(prev => [...prev, {
                    id: Date.now() + 1,
                    text: "You can reach us directly at +91 9090598756. Opening your dialer now...",
                    sender: 'bot',
                    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                }]);
                setTimeout(() => window.location.href = 'tel:+919090598756', 1500);
            }, 500);
            setIsTyping(false);
            return;
        } else if (lowerText === "go back" || lowerText === "main menu") {
            localResponse = "Sure, what's your question about?";
            localOptions = INITIAL_OPTIONS;
        }

        // Handle "Create Account" / "Register" specifically to guide the bot
        // If user creates account, we want the bot to take over, so we DON'T return/intercept here completely,
        // but we might want to change the text sent to the backend if needed.
        // For now, let's assume the backend LLM handles "Create Account" well. 
        // We just renamed "Register Issues" to "Create Account" in the list above.

        if (localResponse) {
            setTimeout(() => {
                setMessages(prev => [...prev, {
                    id: Date.now() + 1,
                    text: localResponse,
                    sender: 'bot',
                    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    options: localOptions
                }]);
                setIsTyping(false);
            }, 800); // Slight delay for realism
            return;
        }
        // ------------------------------

        try {
            const token = localStorage.getItem('token');
            const headers = { 'Content-Type': 'application/json' };
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const response = await fetch('/api/chatbot/chat', {
                method: 'POST',
                headers: headers,
                body: JSON.stringify({
                    message: textToSend,
                    history: messages // Pass existing history to context
                })
            });

            const data = await response.json();

            if (!response.ok) {
                if (response.status === 429) {
                    throw new Error("Rate limit exceeded");
                }
                throw new Error(data.error || 'Failed to get response');
            }

            let replyText = data.reply;
            let actionMatch = null;
            let bookingDetails = null;

            // 1. Check for explicit ACTION format
            const actionRegex = /\|\|\| ACTION: BOOK_VEHICLE (.*?) \|\|\|/s;
            const match = replyText.match(actionRegex);

            if (match) {
                actionMatch = match;
            }

            // 2. Fallback: Check for JSON code block matching pattern
            if (!actionMatch) {
                const jsonRegex = /```json\s*({[\s\S]*?"action":\s*"BOOK_VEHICLE"[\s\S]*?})\s*```/s;
                const jsonMatch = replyText.match(jsonRegex);
                if (jsonMatch) {
                    actionMatch = jsonMatch;
                }
            }

            if (actionMatch) {
                try {
                    let jsonStr = actionMatch[1];
                    // Cleanup markdown if present
                    if (jsonStr.includes("```")) {
                        jsonStr = jsonStr.replace(/```json/g, "").replace(/```/g, "");
                    }

                    bookingDetails = JSON.parse(jsonStr);

                    // Remove the action part from the visible reply
                    if (match) {
                        replyText = replyText.replace(match[0], "").trim();
                    } else if (replyText.includes("```json")) {
                        // Strip JSON block
                        replyText = replyText.replace(/```json[\s\S]*?```/, "").trim();
                    }

                    // Trigger Redirect
                    setTimeout(() => {
                        setMessages(prev => [...prev, {
                            id: Date.now() + 2,
                            text: "Great! I have all the details. Redirecting you to the booking page now...",
                            sender: 'bot',
                            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        }]);

                        setTimeout(() => {
                            const vId = bookingDetails.vehicleId;
                            const vType = bookingDetails.type;
                            window.location.href = `/booking-form?vehicleId=${vId}&type=${vType}&startDate=${bookingDetails.startDate}&startTime=${bookingDetails.startTime}&duration=${bookingDetails.duration}`;
                        }, 2000);
                    }, 500);

                } catch (e) {
                    console.error("Failed to parse booking action", e);
                }
            }

            // 3. New Actions: TRACK and CANCEL
            if (!actionMatch) {
                // Regex for TRACK
                const trackRegex = /\|\|\| ACTION: TRACK_BOOKING (.*?) \|\|\|/s;
                const trackMatch = replyText.match(trackRegex);
                if (trackMatch) {
                    try {
                        let jsonStr = trackMatch[1];
                        const details = JSON.parse(jsonStr);
                        replyText = replyText.replace(trackMatch[0], "").trim();

                        setTimeout(() => {
                            setMessages(prev => [...prev, {
                                id: Date.now() + 2,
                                text: "Let's check the status for you. Redirecting...",
                                sender: 'bot',
                                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            }]);
                            setTimeout(() => {
                                window.location.href = `/track-booking?bookingId=${details.bookingId}`;
                            }, 1500);
                        }, 500);
                    } catch (e) {
                        console.error("Failed to parse track action", e);
                    }
                }

                // Regex for CANCEL
                const cancelRegex = /\|\|\| ACTION: CANCEL_BOOKING (.*?) \|\|\|/s;
                const cancelMatch = replyText.match(cancelRegex);
                if (cancelMatch) {
                    try {
                        let jsonStr = cancelMatch[1];
                        const details = JSON.parse(jsonStr);
                        replyText = replyText.replace(cancelMatch[0], "").trim();

                        setTimeout(() => {
                            setMessages(prev => [...prev, {
                                id: Date.now() + 2,
                                text: `I'll take you to the cancellation page for Booking #${details.bookingId}. Please review the details there.`,
                                sender: 'bot',
                                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            }]);
                            setTimeout(() => {
                                window.location.href = `/track-booking?bookingId=${details.bookingId}&action=cancel`;
                            }, 1500);
                        }, 500);
                    } catch (e) {
                        console.error("Failed to parse cancel action", e);
                    }
                }

                // Regex for REGISTER
                const registerRegex = /\|\|\| ACTION: REGISTER_USER (.*?) \|\|\|/s;
                const registerMatch = replyText.match(registerRegex);
                if (registerMatch) {
                    try {
                        let jsonStr = registerMatch[1];
                        const details = JSON.parse(jsonStr);
                        replyText = replyText.replace(registerMatch[0], "").trim();

                        setTimeout(() => {
                            setMessages(prev => [...prev, {
                                id: Date.now() + 2,
                                text: `Got it! I've pre-filled the registration details and sent verification codes to your email and phone. Redirecting...`,
                                sender: 'bot',
                                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            }]);
                            setTimeout(() => {
                                const params = new URLSearchParams();
                                if (details.fullName) params.append('fullName', details.fullName);
                                if (details.email) params.append('email', details.email);
                                if (details.phoneNumber) params.append('phoneNumber', details.phoneNumber);
                                if (details.password) params.append('password', details.password);

                                window.location.href = `/register-user?${params.toString()}`;
                            }, 1500);
                        }, 500);
                    } catch (e) {
                        console.error("Failed to parse register action", e);
                    }
                }

                // Regex for WEATHER CHECK
                const weatherRegex = /\|\|\| ACTION: CHECK_WEATHER (.*?) \|\|\|/s;
                const weatherMatch = replyText.match(weatherRegex);
                if (weatherMatch) {
                    try {
                        let jsonStr = weatherMatch[1];
                        const details = JSON.parse(jsonStr);
                        replyText = replyText.replace(weatherMatch[0], "").trim();

                        // Call weather API
                        fetch('/api/chatbot/weather', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ location: details.location })
                        })
                            .then(res => res.json())
                            .then(weatherData => {
                                setMessages(prev => [...prev, {
                                    id: Date.now() + 3,
                                    text: weatherData.reply || weatherData.error || "Unable to fetch weather information.",
                                    sender: 'bot',
                                    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                }]);
                            })
                            .catch(err => {
                                console.error("Weather API Error:", err);
                                setMessages(prev => [...prev, {
                                    id: Date.now() + 3,
                                    text: "Sorry, I couldn't fetch the weather information right now. Please try again later.",
                                    sender: 'bot',
                                    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                }]);
                            });
                    } catch (e) {
                        console.error("Failed to parse weather action", e);
                    }
                }

                // Regex for CALL SUPPORT
                const supportRegex = /\|\|\| ACTION: CALL_SUPPORT (.*?) \|\|\|/s;
                const supportMatch = replyText.match(supportRegex);
                if (supportMatch) {
                    try {
                        let jsonStr = supportMatch[1];
                        const details = JSON.parse(jsonStr);
                        replyText = replyText.replace(supportMatch[0], "").trim();

                        setTimeout(() => {
                            setMessages(prev => [...prev, {
                                id: Date.now() + 2,
                                text: "Connecting you to our support team...",
                                sender: 'bot',
                                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            }]);
                            setTimeout(() => {
                                window.location.href = `tel:${details.number}`;
                            }, 1500);
                        }, 500);
                    } catch (e) {
                        console.error("Failed to parse support action", e);
                    }
                }
            }


            const botResponse = {
                id: Date.now() + 1,
                text: replyText,
                sender: 'bot',
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                options: null // API responses might not have hardcoded options unless we parse them
            };
            setMessages(prev => [...prev, botResponse]);

        } catch (error) {

            console.error('Chatbot API Error Details:', error); // Expanded logging
            const errorResponse = {
                id: Date.now() + 1,
                text: "I'm having a bit of trouble connecting to my brain right now. Please try again in a moment! (Error: " + error.message + ")",
                sender: 'bot',
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                options: ["Retry", "Go back"]
            };
            setMessages(prev => [...prev, errorResponse]);
        } finally {
            setIsTyping(false);
        }
    };

    const handleOptionClick = (option) => {
        handleSend(option);
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            handleSend();
        }
    };

    // Note: The container class needs 'open' to animate visible
    return (
        <div className={`chatbot-container ${isOpen ? 'open' : ''}`}>
            {/* Header */}
            <div className="chatbot-header">
                <div className="chatbot-profile">
                    <div className="chatbot-avatar">
                        <img src={chatbotImg} alt="Bot" />
                    </div>
                    <div className="chatbot-info">
                        <h3>RentHub Support</h3>
                    </div>
                </div>
                <div className="chatbot-controls">
                    <div className="control-btn" onClick={onClose} title="Minimize">
                        <i className="fas fa-chevron-down"></i>
                    </div>
                </div>
            </div>

            {/* Body */}
            <div className="chatbot-body">
                {messages.map((msg) => (
                    <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                        <div className={`message ${msg.sender}`}>
                            {msg.sender === 'bot' ? (
                                <ReactMarkdown>{msg.text}</ReactMarkdown>
                            ) : (
                                msg.text
                            )}
                            <span className="message-time">{msg.time}</span>
                        </div>

                        {/* Options / Chips */}
                        {msg.options && (
                            <div className="options-container">
                                {msg.options.map((opt, idx) => (
                                    <button
                                        key={idx}
                                        className="option-btn"
                                        onClick={() => handleOptionClick(opt)}
                                    >
                                        {opt} <i className="fas fa-chevron-right"></i>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                ))}

                {isTyping && (
                    <div className="typing-indicator">
                        <div className="dot"></div>
                        <div className="dot"></div>
                        <div className="dot"></div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Footer */}
            <div className="chatbot-footer">
                <input
                    type="text"
                    className="chatbot-input"
                    placeholder="Write a message..."
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyPress={handleKeyPress}
                />
                <button
                    className="send-btn"
                    onClick={() => handleSend()}
                    disabled={!inputValue.trim()}
                >
                    <i className="fas fa-paper-plane"></i>
                </button>
            </div>
        </div>
    );
};

export default Chatbot;
