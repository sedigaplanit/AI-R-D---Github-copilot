// Maps the bare filename stored in the database (e.g. "product_1.png") to the
// webpack-bundled URL so images work in both dev and production builds.
import p1  from './product_1.png';
import p2  from './product_2.png';
import p3  from './product_3.png';
import p4  from './product_4.png';
import p5  from './product_5.png';
import p6  from './product_6.png';
import p7  from './product_7.png';
import p8  from './product_8.png';
import p9  from './product_9.png';
import p10 from './product_10.png';
import p11 from './product_11.png';
import p12 from './product_12.png';
import p13 from './product_13.png';
import p14 from './product_14.png';
import p15 from './product_15.png';
import p16 from './product_16.png';
import p17 from './product_17.png';
import p18 from './product_18.png';
import p19 from './product_19.png';
import p20 from './product_20.png';
import p21 from './product_21.png';
import p22 from './product_22.png';
import p23 from './product_23.png';
import p24 from './product_24.png';
import p25 from './product_25.png';
import p26 from './product_26.png';
import p27 from './product_27.png';
import p28 from './product_28.png';
import p29 from './product_29.png';
import p30 from './product_30.png';
import p31 from './product_31.png';
import p32 from './product_32.png';
import p33 from './product_33.png';
import p34 from './product_34.png';
import p35 from './product_35.png';
import p36 from './product_36.png';

const IMAGE_MAP = {
  'product_1.png':  p1,  'product_2.png':  p2,  'product_3.png':  p3,
  'product_4.png':  p4,  'product_5.png':  p5,  'product_6.png':  p6,
  'product_7.png':  p7,  'product_8.png':  p8,  'product_9.png':  p9,
  'product_10.png': p10, 'product_11.png': p11, 'product_12.png': p12,
  'product_13.png': p13, 'product_14.png': p14, 'product_15.png': p15,
  'product_16.png': p16, 'product_17.png': p17, 'product_18.png': p18,
  'product_19.png': p19, 'product_20.png': p20, 'product_21.png': p21,
  'product_22.png': p22, 'product_23.png': p23, 'product_24.png': p24,
  'product_25.png': p25, 'product_26.png': p26, 'product_27.png': p27,
  'product_28.png': p28, 'product_29.png': p29, 'product_30.png': p30,
  'product_31.png': p31, 'product_32.png': p32, 'product_33.png': p33,
  'product_34.png': p34, 'product_35.png': p35, 'product_36.png': p36,
};

const resolveImage = (filename) => IMAGE_MAP[filename] || filename;

export default resolveImage;
