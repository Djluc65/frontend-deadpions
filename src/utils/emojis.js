export const emojisDisponibles = [
    { id: 1, name: 'Angry', source: require('../../assets/EmojiJason/angry-emoji.json') },
    { id: 2, name: 'Baby', source: require('../../assets/EmojiJason/baby-emoji.json') },
    { id: 3, name: 'Beaming Face', source: require('../../assets/EmojiJason/beaming-face-emoji.json') },
    { id: 4, name: 'Chill Face', source: require('../../assets/EmojiJason/cool-emoji.json') },
    { id: 5, name: 'Clapping Hands', source: require('../../assets/EmojiJason/clapping-hands-emoji.json') },
    { id: 6, name: 'Cold Face', source: require('../../assets/EmojiJason/cold-face-emoji.json') },
    { id: 7, name: 'Cool', source: require('../../assets/EmojiJason/cool-emoji.json') },
    { id: 8, name: 'Crown Splash', source: require('../../assets/EmojiJason/crown-emoji-splash.json') },
    { id: 9, name: 'Crying', source: require('../../assets/EmojiJason/crying-emoji.json') },
    { id: 10, name: 'Crying Face', source: require('../../assets/EmojiJason/crying-face-emoji.json') },
    { id: 11, name: 'Devil Face', source: require('../../assets/EmojiJason/devil-face-emoji.json') },
    { id: 12, name: 'Driving Face', source: require('../../assets/EmojiJason/driving-face-emoji.json') },
    { id: 13, name: 'Thinking', source: require('../../assets/EmojiJason/thinking-emoji.json') },
    { id: 14, name: 'Eyes', source: require('../../assets/EmojiJason/eyes-emoji.json') },
    { id: 15, name: 'Blowing Kiss', source: require('../../assets/EmojiJason/face-blowing-a-kiss-emoji.json') },
    { id: 16, name: 'Holding Back Tears', source: require('../../assets/EmojiJason/face-holding-back-tears-emoji.json') },
    { id: 17, name: 'Fake Smile', source: require('../../assets/EmojiJason/fake-smile-emoji.json') },
    { id: 18, name: 'Fearful Face', source: require('../../assets/EmojiJason/fearful-face-emoji.json') },
    { id: 19, name: 'Flexed Biceps', source: require('../../assets/EmojiJason/muscle-emoji.json') },
    { id: 20, name: 'Funny', source: require('../../assets/EmojiJason/funny-emoji.json') },
    { id: 21, name: 'Grinning Face', source: require('../../assets/EmojiJason/happy-face-emoji.json') },
    { id: 22, name: 'Happy Face', source: require('../../assets/EmojiJason/happy-face-emoji.json') },
    { id: 23, name: 'Headphones', source: require('../../assets/EmojiJason/emoji.json') },
    { id: 24, name: 'Hi Face', source: require('../../assets/EmojiJason/emoji.json') },
    { id: 25, name: 'House Face', source: require('../../assets/EmojiJason/emoji.json') },
    { id: 26, name: 'Kiss Face', source: require('../../assets/EmojiJason/kiss-face-emoji.json') },
    { id: 27, name: 'Kiss Mark Splash', source: require('../../assets/EmojiJason/kiss-mark-emoji-splash.json') },
    { id: 28, name: 'Knife', source: require('../../assets/EmojiJason/knife-emoji.json') },
    { id: 29, name: 'Laughing Face', source: require('../../assets/EmojiJason/laughing-face-emoji.json') },
    { id: 30, name: 'Liar Face', source: require('../../assets/EmojiJason/emoji.json') },
    { id: 31, name: 'Lifting Face', source: require('../../assets/EmojiJason/lifiting-face-emoji.json') },
    { id: 32, name: 'Money', source: require('../../assets/EmojiJason/emoji.json') },
    { id: 33, name: 'Muscle', source: require('../../assets/EmojiJason/muscle-emoji.json') },
    { id: 34, name: 'No Face', source: require('../../assets/EmojiJason/no-face-emoji.json') },
    { id: 35, name: 'Rose Face', source: require('../../assets/EmojiJason/rose-face-emoji.json') },
    { id: 36, name: 'Sad', source: require('../../assets/EmojiJason/sad-emoji.json') },
    { id: 37, name: 'Sad Puppy Eyes', source: require('../../assets/EmojiJason/sad-but-relieved-face-emoji.json') },
    { id: 38, name: 'Smiling Hearts', source: require('../../assets/EmojiJason/smiling-face-with-hearts-emoji.json') },
    { id: 39, name: 'Smiling Sunglasses', source: require('../../assets/EmojiJason/cool-emoji.json') },
    { id: 40, name: 'Squinting Tongue', source: require('../../assets/EmojiJason/tongue-face-emoji.json') },
    { id: 41, name: 'Star Struck', source: require('../../assets/EmojiJason/star-struck-emoji.json') },
    { id: 42, name: 'Tongue Face', source: require('../../assets/EmojiJason/tongue-face-emoji.json') },
    { id: 43, name: 'Upset', source: require('../../assets/EmojiJason/upset-emoji.json') },
    { id: 44, name: 'Yoga Face', source: require('../../assets/EmojiJason/yoga-face-emoji.json') },
];

export const getEmojiSource = (name) => {
    if (!name) return null;
    const emoji = emojisDisponibles.find(e => 
        e.name === name || 
        e.name.toLowerCase() === name.trim().toLowerCase()
    );
    return emoji ? emoji.source : null;
};
