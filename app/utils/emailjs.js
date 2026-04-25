


const PUBLIC_KEY = process.env.EXPO_PUBLIC_EMAILJS_PUBLIC_KEY;
const PRIVATE_KEY = process.env.EXPO_PUBLIC_EMAILJS_PRIVATE_KEY;


export const sendEmail = async (serviceId, templateId, templateParams) => {
    try {
        const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                service_id: serviceId,
                template_id: templateId,
                user_id: PUBLIC_KEY,
                accessToken: PRIVATE_KEY, 
                template_params: templateParams,
            }),
        });

        if (response.ok) {
            const result = await response.text();
            console.log('Email başarıyla gönderildi:', result);
            return result;
        } else {
            const errorData = await response.text();
            console.error('EmailJS API Hatası:', errorData);
            throw new Error(errorData);
        }
    } catch (error) {
        console.error('Email gönderimi sırasında hata oluştu:', error);
        throw error;
    }
};

export default { sendEmail };
