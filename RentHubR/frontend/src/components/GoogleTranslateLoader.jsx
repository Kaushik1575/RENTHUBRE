import { useEffect } from "react";

const GoogleTranslateLoader = () => {
    useEffect(() => {
        // Check if script is already added
        if (document.querySelector('script[src*="translate_a/element.js"]')) {
            return;
        }

        // 1. Define the global callback BEFORE adding the script
        window.googleTranslateElementInit = () => {
            if (window.google && window.google.translate) {
                new window.google.translate.TranslateElement(
                    {
                        pageLanguage: "en",
                        includedLanguages: "en,hi,or", // English, Hindi, Odia
                        autoDisplay: false,
                    },
                    "google_translate_element"
                );
            }
        };

        // 2. Add Google Translate script
        const addScript = document.createElement("script");
        addScript.setAttribute(
            "src",
            "//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit"
        );
        addScript.async = true;
        document.body.appendChild(addScript);

        // Cleanup not strictly necessary for singleton global script, but good practice to allow re-init if needed
    }, []);

    return (
        <div
            id="google_translate_element"
            // Use visibility: hidden instead of display: none
            // display: none can sometimes prevent the script from initializing the UI elements inside
            style={{
                position: 'absolute',
                top: '-9999px',
                left: '-9999px',
                visibility: 'hidden',
                width: '1px',
                height: '1px',
                overflow: 'hidden'
            }}
        ></div>
    );
};

export default GoogleTranslateLoader;
