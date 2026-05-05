export const SAMPLE_DATASETS = [
    {
        key: 'exercise',
        name: 'Exercise.csv',
        desc: '90 rows · 6 columns — exercise type, diet, pulse rate, duration.',
        appPath: 'sample/exercise/Exercise.csv',
        viewUrl: 'https://drive.google.com/file/d/1fWepSyHsCabHABAt-SnGM-wJjQl9fEZH/view?usp=sharing',
    },
    {
        key: 'tips',
        name: 'Tips.csv',
        desc: '244 rows · 7 columns — restaurant tips, bill size, day, time, party size.',
        viewUrl: 'https://drive.google.com/file/d/1L62GGkGioftbCsYj3xBM_ktffIVI1szU/view?usp=sharing',
    },
];

export const EXERCISE_SAMPLE = SAMPLE_DATASETS.find((dataset) => dataset.key === 'exercise');
