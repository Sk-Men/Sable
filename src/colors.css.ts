import { createTheme } from '@vanilla-extract/css';
import { color } from 'folds';

export const silverTheme = createTheme(color, {
  Background: {
    Container: '#F7F6F9',
    ContainerHover: '#EDECF2',
    ContainerActive: '#E3E2EB',
    ContainerLine: '#D9D8E4',
    OnContainer: '#2D235C',
  },

  Surface: {
    Container: '#FFFFFF',
    ContainerHover: '#F7F6F9',
    ContainerActive: '#EDECF2',
    ContainerLine: '#E3E2EB',
    OnContainer: '#2D235C',
  },

  SurfaceVariant: {
    Container: '#F0EFF4',
    ContainerHover: '#E6E5ED',
    ContainerActive: '#DCDAE6',
    ContainerLine: '#D2D1DF',
    OnContainer: '#514861',
  },

  Primary: {
    Main: '#6E56CF',
    MainHover: '#644EC1',
    MainActive: '#5B47B3',
    MainLine: '#5240A5',
    OnMain: '#FFFFFF',
    Container: '#DED9E6',
    ContainerHover: '#D3CDE0',
    ContainerActive: '#C8C1D9',
    ContainerLine: '#BDB6D3',
    OnContainer: '#2D235C',
  },

  Secondary: {
    Main: '#514861',
    MainHover: '#453E54',
    MainActive: '#3B3447',
    MainLine: '#312E3B',
    OnMain: '#FFFFFF',
    Container: '#EAE8F0',
    ContainerHover: '#DEDCE8',
    ContainerActive: '#D2D0E0',
    ContainerLine: '#C6C4D8',
    OnContainer: '#2D235C',
  },

  Success: {
    Main: '#017343',
    MainHover: '#01683C',
    MainActive: '#016239',
    MainLine: '#015C36',
    OnMain: '#FFFFFF',
    Container: '#BFDCD0',
    ContainerHover: '#B3D5C7',
    ContainerActive: '#A6CEBD',
    ContainerLine: '#99C7B4',
    OnContainer: '#01512F',
  },

  Warning: {
    Main: '#864300',
    MainHover: '#793C00',
    MainActive: '#723900',
    MainLine: '#6B3600',
    OnMain: '#FFFFFF',
    Container: '#E1D0BF',
    ContainerHover: '#DBC7B2',
    ContainerActive: '#D5BDA6',
    ContainerLine: '#CFB499',
    OnContainer: '#5E2F00',
  },

  Critical: {
    Main: '#9D0F0F',
    MainHover: '#8D0E0E',
    MainActive: '#850D0D',
    MainLine: '#7E0C0C',
    OnMain: '#FFFFFF',
    Container: '#E7C3C3',
    ContainerHover: '#E2B7B7',
    ContainerActive: '#DDABAB',
    ContainerLine: '#D89F9F',
    OnContainer: '#6E0B0B',
  },

  Other: {
    FocusRing: 'rgba(110, 86, 207, 0.4)',
    Shadow: 'rgba(45, 35, 92, 0.1)',
    Overlay: 'rgba(45, 35, 92, 0.4)',
  },
});
const darkThemeData = {
  Background: {
    Container: '#1B1A21',
    ContainerHover: '#24232C',
    ContainerActive: '#2D2C36',
    ContainerLine: '#363541',
    OnContainer: '#EAE8F0',
  },

  Surface: {
    Container: '#24232C',
    ContainerHover: '#2D2C36',
    ContainerActive: '#363541',
    ContainerLine: '#403F4C',
    OnContainer: '#EAE8F0',
  },

  SurfaceVariant: {
    Container: '#121116',
    ContainerHover: '#1B1A21',
    ContainerActive: '#24232C',
    ContainerLine: '#363541',
    OnContainer: '#BDB6EC',
  },

  Primary: {
    Main: '#BDB6EC',
    MainHover: '#A9A1E6',
    MainActive: '#958BE0',
    MainLine: '#8175DA',
    OnMain: '#1B1A21',
    Container: '#2D235C',
    ContainerHover: '#382D70',
    ContainerActive: '#433784',
    ContainerLine: '#4E4198',
    OnContainer: '#E3E1F7',
  },

  Secondary: {
    Main: '#9992AC',
    MainHover: '#AAA4BA',
    MainActive: '#BBB6C8',
    MainLine: '#CCC8D6',
    OnMain: '#1B1A21',
    Container: '#2D2C36',
    ContainerHover: '#363541',
    ContainerActive: '#403F4C',
    ContainerLine: '#4B4A58',
    OnContainer: '#EAE8F0',
  },

  Success: {
    Main: '#85E0BA',
    MainHover: '#70DBAF',
    MainActive: '#66D9A9',
    MainLine: '#5CD6A3',
    OnMain: '#0F3D2A',
    Container: '#175C3F',
    ContainerHover: '#1A6646',
    ContainerActive: '#1C704D',
    ContainerLine: '#1F7A54',
    OnContainer: '#CCF2E2',
  },

  Warning: {
    Main: '#E3BA91',
    MainHover: '#DFAF7E',
    MainActive: '#DDA975',
    MainLine: '#DAA36C',
    OnMain: '#3F2A15',
    Container: '#5E3F20',
    ContainerHover: '#694624',
    ContainerActive: '#734D27',
    ContainerLine: '#7D542B',
    OnContainer: '#F3E2D1',
  },

  Critical: {
    Main: '#E69D9D',
    MainHover: '#E28D8D',
    MainActive: '#E08585',
    MainLine: '#DE7D7D',
    OnMain: '#401C1C',
    Container: '#602929',
    ContainerHover: '#6B2E2E',
    ContainerActive: '#763333',
    ContainerLine: '#803737',
    OnContainer: '#F5D6D6',
  },

  Other: {
    FocusRing: 'rgba(189, 182, 236, 0.5)',
    Shadow: 'rgba(0, 0, 0, 0.4)',
    Overlay: 'rgba(15, 14, 18, 0.85)',
  },
};

export const darkTheme = createTheme(color, darkThemeData);

export const butterTheme = createTheme(color, {
  Background: {
    Container: '#1A1916',
    ContainerHover: '#26241F',
    ContainerActive: '#333029',
    ContainerLine: '#403C33',
    OnContainer: '#FFFBDE',
  },

  Surface: {
    Container: '#26241F',
    ContainerHover: '#333029',
    ContainerActive: '#403C33',
    ContainerLine: '#4D483D',
    OnContainer: '#FFFBDE',
  },

  SurfaceVariant: {
    Container: '#12110F',
    ContainerHover: '#1B1A17',
    ContainerActive: '#24221F',
    ContainerLine: '#403C33',
    OnContainer: '#E5E2C8',
  },

  Primary: {
    Main: '#E3BA91',
    MainHover: '#DFAF7E',
    MainActive: '#DDA975',
    MainLine: '#DAA36C',
    OnMain: '#1A1916',
    Container: '#453324',
    ContainerHover: '#563F2D',
    ContainerActive: '#674B36',
    ContainerLine: '#78573F',
    OnContainer: '#FFFBDE',
  },

  Secondary: {
    Main: '#FFFBDE',
    MainHover: '#E5E2C8',
    MainActive: '#D9D5BD',
    MainLine: '#CCC9B2',
    OnMain: '#1A1916',
    Container: '#333029',
    ContainerHover: '#403C33',
    ContainerActive: '#4D483D',
    ContainerLine: '#595447',
    OnContainer: '#FFFBDE',
  },

  Success: {
    Main: '#85E0BA',
    MainHover: '#70DBAF',
    MainActive: '#66D9A9',
    MainLine: '#5CD6A3',
    OnMain: '#0F3D2A',
    Container: '#175C3F',
    ContainerHover: '#1A6646',
    ContainerActive: '#1C704D',
    ContainerLine: '#1F7A54',
    OnContainer: '#CCF2E2',
  },

  Warning: {
    Main: '#E3BA91',
    MainHover: '#DFAF7E',
    MainActive: '#DDA975',
    MainLine: '#DAA36C',
    OnMain: '#3F2A15',
    Container: '#5E3F20',
    ContainerHover: '#694624',
    ContainerActive: '#734D27',
    ContainerLine: '#7D542B',
    OnContainer: '#F3E2D1',
  },

  Critical: {
    Main: '#E69D9D',
    MainHover: '#E28D8D',
    MainActive: '#E08585',
    MainLine: '#DE7D7D',
    OnMain: '#401C1C',
    Container: '#602929',
    ContainerHover: '#6B2E2E',
    ContainerActive: '#763333',
    ContainerLine: '#803737',
    OnContainer: '#F5D6D6',
  },

  Other: {
    FocusRing: 'rgba(227, 186, 145, 0.5)',
    Shadow: 'rgba(0, 0, 0, 0.6)',
    Overlay: 'rgba(15, 14, 12, 0.9)',
  },
});