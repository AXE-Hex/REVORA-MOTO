-- Development examples only. Never run against a production database.
insert into public.branches(name_ar,name_en,address_ar,address_en) values('فرع القاهرة','Cairo Showroom','القاهرة، مصر','Cairo, Egypt'),('فرع الإسكندرية','Alexandria Showroom','الإسكندرية، مصر','Alexandria, Egypt');
insert into public.brands(slug,name) values('agv','AGV'),('alpinestars','Alpinestars'),('akrapovic','Akrapovič'),('brembo','Brembo'),('motul','Motul'),('revora','REVORA'),('pirelli','Pirelli'),('givi','Givi') on conflict(slug) do nothing;
insert into public.categories(slug,name_ar,name_en,sort_order) values
('helmets','الخوذ','Helmets',1),('riding-gear','معدات القيادة','Riding Gear',2),('protection','الحماية','Protection',3),('parts','قطع الدراجات','Motorcycle Parts',4),('performance','الأداء','Performance',5),('tires-wheels','الإطارات والعجلات','Tires & Wheels',6),('electrical','الكهرباء','Electrical',7),('electronics','الإلكترونيات','Electronics',8),('body-styling','الهيكل والمظهر','Body & Styling',9),('luggage','الحقائب','Luggage',10),('maintenance','الصيانة','Maintenance',11),('tools','الأدوات','Tools',12),('security','الأمان','Security',13),('lifestyle','نمط الحياة','Lifestyle',14) on conflict(slug) do nothing;
insert into public.categories(parent_id,slug,name_ar,name_en) select c.id,v.slug,v.ar,v.en from (values
('helmets','full-face','وجه كامل','Full Face'),('helmets','modular','قابلة للفتح','Modular'),('helmets','open-face','وجه مفتوح','Open Face'),('helmets','adventure','مغامرات','Adventure'),('helmets','off-road','طرق وعرة','Off-road'),('helmets','visors','واقيات','Visors'),
('riding-gear','jackets','سترات','Jackets'),('riding-gear','gloves','قفازات','Gloves'),('riding-gear','boots','أحذية','Boots'),('riding-gear','pants','سراويل','Pants'),
('parts','brakes','فرامل','Brakes'),('parts','suspension','تعليق','Suspension'),('parts','engine','محرك','Engine'),('parts','chain-sprockets','سلسلة وتروس','Chain & Sprockets'),
('performance','exhaust','عادم','Exhaust'),('performance','air-filters','فلاتر الهواء','Air Filters'),('tires-wheels','sport-tires','إطارات رياضية','Sport Tires'),('electronics','intercoms','اتصال','Intercoms'),('maintenance','engine-oils','زيوت محرك','Engine Oils')) v(parent,slug,ar,en) join public.categories c on c.slug=v.parent on conflict(slug) do nothing;

insert into public.products(category_id,brand_id,slug,sku,name_ar,name_en,description_ar,description_en,price_egp,stock,image_url,featured,status,is_demo)
select c.id,b.id,v.slug,v.sku,v.ar,v.en,v.desc_ar,v.desc_en,v.price,
  case when v.sku in ('GEAR-001','GEAR-002') then 0 else 12 end,
  v.image,v.featured,'active',true from (values
('helmets','agv','agv-k1-s-black','HLM-001','خوذة AGV K1 S سوداء','AGV K1 S Black Helmet','خوذة رياضية كاملة الوجه مع تهوية محسّنة.','Full-face sport helmet with refined ventilation.',14500,true,null),
('helmets','agv','agv-k3-white','HLM-002','خوذة AGV K3 بيضاء','AGV K3 White Helmet','خوذة قيادة يومية بحماية مريحة.','Comfortable everyday full-face protection.',17000,false,null),
('riding-gear','alpinestars','ap-jacket-air','GEAR-001','سترة قيادة هوائية','Airflow Riding Jacket','سترة قيادة خفيفة مع مناطق تهوية.','Lightweight riding jacket with ventilation zones.',7800,true,null),
('riding-gear','alpinestars','ap-gloves-race','GEAR-002','قفازات سباق جلدية','Race Leather Gloves','قبضة ثابتة وحماية للكف.','Secure grip and reinforced palm protection.',3900,false,null),
('protection','alpinestars','back-protector','PRO-001','واقي ظهر متقدم','Advanced Back Protector','حماية ظهر مرنة للقيادة اليومية.','Flexible back protection for everyday riding.',3600,false,null),
('protection','revora','knee-guards','PRO-002','واقيات ركبة','Knee Guards','واقيات ركبة قابلة للتعديل.','Adjustable knee guards.',1900,false,null),
('parts','brembo','brake-pads-front','PART-001','تيل فرامل أمامي','Front Brake Pads','أداء كبح ثابت مع توافق محدد.','Consistent braking with exact fitment.',2400,true,null),
('parts','revora','chain-kit-525','PART-002','طقم سلسلة 525','525 Chain Kit','طقم سلسلة وتروس للخدمة الدورية.','Chain and sprocket service kit.',5400,false,null),
('performance','akrapovic','slip-on-titanium','PERF-001','عادم تيتانيوم','Titanium Slip-on Exhaust','عادم خفيف الوزن بتصميم رياضي.','Lightweight sport slip-on exhaust.',32000,true,null),
('performance','revora','performance-filter','PERF-002','فلتر هواء رياضي','Performance Air Filter','فلتر عالي التدفق مع توافق محدد.','High-flow filter with exact fitment.',2500,false,null),
('tires-wheels','pirelli','diablo-rosso-front','TIRE-001','إطار ديابلو روسو أمامي','Diablo Rosso Front Tire','إطار رياضي للطرق الجافة والمبللة.','Sport tire for dry and wet roads.',7900,true,null),
('tires-wheels','pirelli','diablo-rosso-rear','TIRE-002','إطار ديابلو روسو خلفي','Diablo Rosso Rear Tire','تماسك وثبات في المنعطفات.','Grip and stability through corners.',9600,false,null),
('electrical','revora','battery-12v','ELEC-001','بطارية 12 فولت','12V Motorcycle Battery','بطارية موثوقة للاستخدام اليومي.','Reliable battery for everyday use.',3600,false,null),
('electrical','revora','led-indicators','ELEC-002','إشارات LED','LED Indicators','إشارات LED بتصميم مدمج.','Compact LED indicators.',1800,false,null),
('electronics','revora','bluetooth-intercom','TECH-001','اتصال خوذة بلوتوث','Bluetooth Helmet Intercom','اتصال واضح أثناء الرحلات.','Clear communication on every ride.',5500,true,null),
('electronics','revora','phone-mount','TECH-002','حامل هاتف للدراجة','Motorcycle Phone Mount','حامل محكم مناسب للقيادة.','Secure phone mount for riding.',1200,false,null),
('body-styling','revora','sport-windscreen','BODY-001','زجاج أمامي رياضي','Sport Windscreen','تحسين انسيابية الهواء.','Improved wind management.',4200,false,null),
('body-styling','revora','frame-sliders','BODY-002','حماية إطار جانبية','Frame Sliders','حماية إضافية للهيكل.','Extra protection for the frame.',3000,false,null),
('luggage','givi','top-box-45l','LUG-001','صندوق خلفي 45 لتر','45L Top Box','مساحة تخزين واسعة للرحلات.','Generous storage for longer rides.',8500,false,null),
('luggage','givi','tank-bag','LUG-002','حقيبة خزان','Tank Bag','حقيبة عملية للوصول السريع.','Practical quick-access tank bag.',2800,false,null),
('maintenance','motul','engine-oil-10w40','MAIN-001','زيت محرك 10W40','10W40 Engine Oil','زيت محرك للقيادة اليومية.','Engine oil for everyday riding.',850,true,null),
('maintenance','motul','chain-lube','MAIN-002','بخاخ تشحيم سلسلة','Chain Lubricant','تشحيم وحماية السلسلة.','Lubricates and protects the chain.',450,false,null),
('tools','revora','paddock-stand','TOOL-001','حامل صيانة خلفي','Rear Paddock Stand','حامل ثابت لأعمال الصيانة.','Stable stand for maintenance.',4200,false,null),
('tools','revora','tool-kit','TOOL-002','عدة صيانة متنقلة','Roadside Tool Kit','أدوات أساسية للرحلات.','Essential tools for the road.',2300,false,null),
('security','revora','disc-lock','SEC-001','قفل قرص فرامل','Disc Lock','قفل مدمج للدراجة.','Compact motorcycle disc lock.',1600,false,null),
('security','revora','security-chain','SEC-002','سلسلة أمان','Security Chain','سلسلة فولاذية قوية.','Heavy-duty steel security chain.',2700,false,null),
('lifestyle','revora','revora-tee','LIFE-001','تيشيرت REVORA','REVORA Tee','تيشيرت قطني بشعار REVORA.','Cotton tee with REVORA mark.',900,false,null),
('lifestyle','revora','revora-cap','LIFE-002','قبعة REVORA','REVORA Cap','قبعة يومية بطابع رياضي.','Everyday motorsport cap.',650,false,null)
) v(category,brand,slug,sku,ar,en,desc_ar,desc_en,price,featured,image) join public.categories c on c.slug=v.category join public.brands b on b.slug=v.brand on conflict(slug) do nothing;
insert into public.product_variants(product_id,sku,attributes,price_egp,stock) select p.id,v.sku,jsonb_build_object('size',v.size),v.price,8 from (values('ap-jacket-air','GEAR-001-S','S',7800),('ap-jacket-air','GEAR-001-M','M',7800),('ap-jacket-air','GEAR-001-L','L',8000),('ap-gloves-race','GEAR-002-S','S',3900),('ap-gloves-race','GEAR-002-M','M',3900),('ap-gloves-race','GEAR-002-L','L',4100)) v(product,sku,size,price) join public.products p on p.slug=v.product on conflict(sku) do nothing;

insert into public.motorcycle_brands(name,slug) values('BMW','bmw'),('Ducati','ducati'),('Kawasaki','kawasaki'),('Yamaha','yamaha'),('Honda','honda') on conflict(slug) do nothing;
insert into public.motorcycle_models(brand_id,name,slug) select b.id,v.name,v.slug from (values('bmw','S 1000 RR','s1000rr'),('ducati','Panigale V4','panigale-v4'),('kawasaki','Ninja ZX-6R','ninja-zx6r'),('yamaha','YZF-R1','yzf-r1'),('honda','CBR 650R','cbr-650r')) v(brand,name,slug) join public.motorcycle_brands b on b.slug=v.brand on conflict(brand_id,slug) do nothing;
insert into public.motorcycle_variants(model_id,name,engine_cc,start_year) select m.id,v.variant,v.cc,2020 from (values('s1000rr','M Package',999),('panigale-v4','Standard',1103),('ninja-zx6r','Standard',636),('yzf-r1','Standard',998),('cbr-650r','Standard',649)) v(model,variant,cc) join public.motorcycle_models m on m.slug=v.model on conflict(model_id,name,start_year) do nothing;
insert into public.motorcycles(variant_id,branch_id,slug,stock_ref,name_ar,name_en,description_ar,description_en,condition,year,price_egp,deposit_egp,image_url,engine_cc,horsepower,mileage_km,specs,is_demo)
select v.id,b.id,x.slug,x.ref,x.ar,x.en,x.desc_ar,x.desc_en,x.condition,x.year,x.price,x.deposit,x.image,x.cc,x.hp,x.mileage,jsonb_build_object('transmission','6 speed','ABS',true,'fuel_tank_l',x.tank),true from (values
('s1000rr','bmw-s1000rr-2026','RM-001','بي إم دبليو S 1000 RR','BMW S 1000 RR','أداء حلبات السباق لكل منعطف.','Track-bred performance for every corner.','new',2026,1950000,100000,999,210,null,16.5,'/images/revora-hero.png'),
('panigale-v4','ducati-panigale-v4-2026','RM-002','دوكاتي بانيجالي V4','Ducati Panigale V4','هندسة إيطالية بلمسة فنية.','Italian engineering in its purest form.','new',2026,2400000,120000,1103,216,null,17.0,'/images/revora-red-sport.png'),
('ninja-zx6r','kawasaki-ninja-zx6r-2026','RM-003','كاواساكي نينجا ZX-6R','Kawasaki Ninja ZX-6R','رشاقة وقوة لقيادة استثنائية.','Agile power for an unforgettable ride.','new',2026,980000,50000,636,124,null,17.0,'/images/revora-hero.png'),
('yzf-r1','yamaha-r1-2022-used','RM-004','ياماها R1 مستعملة','Yamaha YZF-R1 Pre-Owned','دراجة رياضية فُحصت بعناية.','Inspected superbike ready for its next ride.','used',2022,1120000,60000,998,200,8200,17.0,'/images/revora-blue-sport.png'),
('cbr-650r','honda-cbr650r-2023-used','RM-005','هوندا CBR 650R مستعملة','Honda CBR 650R Pre-Owned','توازن مثالي بين الراحة والأداء.','A confident balance of comfort and performance.','used',2023,580000,30000,649,95,12400,15.4,'/images/revora-red-sport.png'),
('s1000rr','bmw-s1000rr-2021-used','RM-006','بي إم دبليو S 1000 RR مستعملة','BMW S 1000 RR Pre-Owned','قوة رياضية مع تاريخ خدمة موثق.','Superbike power with documented service.','used',2021,1180000,60000,999,205,17200,16.5,'/images/revora-hero.png')
) x(model,slug,ref,ar,en,desc_ar,desc_en,condition,year,price,deposit,cc,hp,mileage,tank,image) join public.motorcycle_variants v on v.model_id=(select id from public.motorcycle_models where slug=x.model) join public.branches b on b.name_en='Cairo Showroom' on conflict(slug) do nothing;
insert into public.used_motorcycle_details(motorcycle_id,owners_count,inspection_status,warranty_status,service_history) select id,1,'inspected','none','Documented service history' from public.motorcycles where condition='used' on conflict do nothing;
insert into public.motorcycle_images(motorcycle_id,url,alt_ar,alt_en,sort_order) select id,image_url,name_ar,name_en,0 from public.motorcycles where image_url is not null;
insert into public.fitment_rules(product_id,variant_id,year_from,year_to) select p.id,v.id,2020,2026 from public.products p cross join public.motorcycle_variants v where p.slug in ('brake-pads-front','sport-windscreen','frame-sliders','performance-filter') and v.name='M Package' on conflict do nothing;
insert into public.fitment_rules(product_id,is_universal) select id,true from public.products where slug in ('chain-lube','tool-kit','disc-lock','phone-mount') on conflict do nothing;
