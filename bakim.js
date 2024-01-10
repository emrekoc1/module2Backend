
const express = require('express');
const router = express.Router();
const QRCode = require('qrcode');
const axios = require('axios');
const nodemailer = require("nodemailer");
const cors = require('cors');
const { format } = require('date-fns');
const http = require('http');
const request = require('request')
router.use(cors());
const pool = require('./db');
const { machine } = require('os');
const multer = require('multer');
const path = require('path');
const transliteration = require('transliteration');




const storageDocs = multer.diskStorage({

    destination: (req, file, callBack) => {
        const destinationPath = path.join(__dirname, '..', '..', '..', '..', '..', '..', 'wamp64', 'www','bakim', 'assets', 'docs');
      //const destinationPath = path.join(__dirname, '..', 'front end', 'front end', 'src', 'assets', 'docs');
      console.log("burayı tamamladı ", destinationPath)
      callBack(null, destinationPath)
    },
    filename: (req, file, callBack) => {
      const bugun = new Date();
      const tarihDamgasi = bugun.toISOString().replace(/[:.]/g, '').substring(0, 10); // Sadece '2023-08-25' bölümü
      const originalnameWithoutExtension = path.parse(file.originalname).name;
      const transliteratedName = transliteration.slugify(originalnameWithoutExtension, { lowercase: false });
      callBack(null, `bakimDokuman${tarihDamgasi}${transliteratedName}${path.extname(file.originalname)}`);
  
    }
  
  
  })
  const uploadDocs = multer({ storage: storageDocs })

  router.post('/insertMachineDokuman', uploadDocs.array('files'), async (req, res, next) => {
    const {machine_id,machine_name,dokuman_name,dokuman_turu} = req.body
    
    const files = req.files;
  
    console.log(files) 
    
    if (!files) {
      const error = new Error('No File')
      error.httpStatusCode = 400
      console.log("buraya geldi ?")// buraya geliyor 

      return next(error)
    }
    try {
      console.log("buraya geldi mi")
      let belge_url = `assets\\docs\\${files[0].filename}`
      
      result = await pool.query(`INSERT INTO public.main_machine_dokuman(
         name, dokuman_url, machine_id, makina_name,dokuman_turu)
        VALUES ('${dokuman_name}', '${belge_url}', ${machine_id}, '${machine_name}', '${dokuman_turu}');`);
       
      res.send({ status: 200 });
    } catch (error) {
      console.log(error)
    }
  
  })
router.get('/machines', cors(), async (req, res) => {
  const id = req.params.code;
  try {

    const result = await pool.query('SELECT m.*, md.urunkodu,md.id as detail_id, SUM(mp.quantity) AS total_quantity, SUM(mp.qualtiy_quantity) AS total_qualtiy_quantity FROM machines m LEFT JOIN machine_detail md ON m.id = md.machines_id LEFT JOIN machine_product mp ON md.id = mp.machine_detail_id  WHERE  md.bitti = 0 GROUP BY  m.id, m.name, m.eksen, m.tur, m.firma, m.calisiyormu, md.urunkodu,md.id');
    const data = result.rows;

    res.status(200).json({ data });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
})
router.post('/getMachinesOnarim', cors(), async (req, res) => {

  try {

    const result = await pool.query(`SELECT 
    mm.*, ma.durum as aylik_durum,maa.durum as alti_durum,mua.durum as ucaylik_durum,my.durum as yillik_durum,
    ma.p_aylik, ma.g_aylik, ma.id AS aylik_id, 
    mua.id AS ucaylik_id, mua.p_ucaylik, mua.g_ucaylik, 
    maa.id AS altiaylik_id, maa.p_altiaylik, maa.g_altiaylik, 
    my.id AS yillik_id, my.p_yillik, my.g_yillik,mar.id as ariza_id, mar.ariza_tarih,mar.g_tarih,
    json_agg(mbd_aylik.*) AS aylik_bakim, 
    json_agg(mbd_altiaylik.*) AS altiaylik_bakim,
    json_agg(mbd_ucaylik.*) AS ucaylik_bakim ,
    json_agg(mbd_yillikaylik.*)as yillik_bakim,
   json_agg(mbd_ariza.*)as ariza
FROM 
    main_machines mm
LEFT JOIN 
    machines_aylik ma ON ma.machines_id = mm.id AND ma.durum = 0
LEFT JOIN 
    machines_ucaylik mua ON mua.machines_id = mm.id AND mua.durum = 0
LEFT JOIN 
    machines_altiaylik maa ON maa.machines_id = mm.id AND maa.durum = 0
LEFT JOIN 
    machines_yillik my ON my.machines_id = mm.id AND my.durum = 0
LEFT JOIN 
    machines_ariza mar ON mar.machines_id = mm.id   AND mar.durum != 0 
LEFT JOIN 
    machine_bakim_detail mbd_aylik ON ma.id = mbd_aylik.bakim_id and mbd_aylik.type = 1
LEFT JOIN 
    machine_bakim_detail mbd_altiaylik ON maa.id = mbd_altiaylik.bakim_id and mbd_altiaylik.type = 6
LEFT JOIN 
    machine_bakim_detail mbd_ucaylik ON mua.id = mbd_ucaylik.bakim_id and mbd_ucaylik.type = 3
LEFT JOIN 
    machine_bakim_detail mbd_yillikaylik ON mua.id = mbd_yillikaylik.bakim_id and mbd_yillikaylik.type = 12
LEFT JOIN 
    machine_bakim_detail mbd_ariza ON mar.id = mbd_ariza.bakim_id AND mbd_ariza.type = 0
GROUP BY 
    mm.id, ma.p_aylik, ma.g_aylik, ma.id,mar.ariza_tarih,mar.g_tarih,mar.id ,
    mua.id, mua.p_ucaylik, mua.g_ucaylik, 
    maa.id, maa.p_altiaylik, maa.g_altiaylik, 
    my.id, my.p_yillik, my.g_yillik`);
    const data = result.rows;
    res.status(200).json({ status: 200, data: data });


  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
})
router.post('/insertMachine', cors(), async (req, res) => {
  const { planlanan_tarih,
    machine_name,
    seri_no,
    birim,
    user_name,
    durum_name,
    durum,
    user_id } = req.body
  const machineData = {
    machine_name: machine_name,
    seri_no: seri_no,
    birim: birim
  };
  const qrData = JSON.stringify(machineData);


  try {
    const qrCodeData = await new Promise((resolve, reject) => {
      QRCode.toDataURL(qrData, (err, url) => {
        if (err) {
          console.error(err);
          reject(err);
        } else {
          resolve(url);
        }
      });
    });
    const result = await pool.query(`INSERT INTO main_machines(machines_name, seri_no, birim_id, durum, qr)  VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [machine_name, seri_no, parseInt(birim), durum, qrCodeData]
    );

    let machine_id = result.rows[0].id;

    const tarihParcalari = planlanan_tarih.split('-');

    const yil = parseInt(tarihParcalari[2], 10);
    const ay = parseInt(tarihParcalari[1], 10) - 1;
    const gun = parseInt(tarihParcalari[0], 10);
    const tarihAylik = new Date(yil, ay, gun);
    tarihAylik.setDate(tarihAylik.getDate() + (1 * 30));
    const yeniTarih = `${tarihAylik.getDate()}.${tarihAylik.getMonth() + 1}.${tarihAylik.getFullYear()}`;
    const tarih3Aylik = new Date(yil, ay, gun);
    tarih3Aylik.setDate(tarih3Aylik.getDate() + (3 * 30));
    const yeniTarih3 = `${tarih3Aylik.getDate()}.${tarih3Aylik.getMonth() + 1}.${tarih3Aylik.getFullYear()}`;
    const tarih6Aylik = new Date(yil, ay, gun);
    tarih6Aylik.setDate(tarih6Aylik.getDate() + (6 * 30));
    const yeniTarih6 = `${tarih6Aylik.getDate()}.${tarih6Aylik.getMonth() + 1}.${tarih6Aylik.getFullYear()}`;
    const tarih12Aylik = new Date(yil, ay, gun);
    tarih12Aylik.setDate(tarih12Aylik.getDate() + (12 * 30));
    const yeniTarih12 = `${tarih12Aylik.getDate()}.${tarih12Aylik.getMonth() + 1}.${tarih12Aylik.getFullYear()}`;

    const insertMAchineAylik = await pool.query(`INSERT INTO machines_aylik(
      p_aylik,  machines_id, durum)
      VALUES ('${yeniTarih}', ${machine_id}, 0);`)
    const insertMAchine3Aylik = await pool.query(`INSERT INTO machines_ucaylik(
      p_ucaylik,  machines_id, durum)
      VALUES ('${yeniTarih3}', ${machine_id}, 0);`)
    const insertMAchine6Aylik = await pool.query(`INSERT INTO machines_altiaylik(
        p_altiaylik,  machines_id, durum)
        VALUES ('${yeniTarih6}', ${machine_id}, 0);`)
    const insertMAchine12Aylik = await pool.query(`INSERT INTO machines_yillik(
          p_yillik,  machines_id, durum)
          VALUES ('${yeniTarih12}', ${machine_id}, 0);`)

    res.status(200).json({ status: 200, data: result });


  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
})
router.post('/getAyrintiMachinesOnarim', cors(), async (req, res) => {
  const { machine_id, type, bakim_id } = req.body
  console.log("burda mıyız?", req.body)
  try {
    let result
    let data
    result = await pool.query(`
      SELECT * FROM machine_bakim_detail WHERE type= ${type} AND bakim_id =  ${bakim_id} AND machine_id =  ${machine_id}
  
    `);
    data = result.rows;


    res.status(200).json({ status: 200, data: data });


  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
})
router.post('/getMachineDokuman', cors(), async (req, res) => {
  const { machine_id } = req.body
  try {
    let result
    let data

   result = await pool.query(`SELECT * FROM  main_machine_dokuman WHERE machine_id = ${machine_id}
        `);
    data = result.rows;


    res.status(200).json({ status: 200, data: data });


  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
})
router.post('/insertMachineDokuman', cors(), async (req, res) => {
  const { machine_id } = req.body
  try {
    let result
    let data

   result = await pool.query(`SELECT * FROM  main_machine_dokuman WHERE machine_id = ${machine_id}
        `);
    data = result.rows;


    res.status(200).json({ status: 200, data: data });


  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
})
router.post('/getGecmisMachinesOnarim', cors(), async (req, res) => {
  const { machine_id, type } = req.body

  try {
    let result
    let data

    console.log(type)
    switch (type) {
      case 1:
        result = await pool.query(`
      SELECT 
          mm.*,  ma.durum as aylik_durum,
          ma.p_aylik, ma.g_aylik, ma.id AS aylik_id, 
         
          json_agg(mbd_aylik.*) AS aylik_bakim
        
      FROM 
          main_machines mm
      LEFT JOIN 
          machines_aylik ma ON ma.machines_id = mm.id
     
      LEFT JOIN 
          machine_bakim_detail mbd_aylik ON ma.id = mbd_aylik.bakim_id
       WHERE mm.id = ${machine_id}
      GROUP BY 
          mm.id, ma.p_aylik, ma.g_aylik, ma.id
        `);
        data = result.rows;
        break;
      case 3:
        result = await pool.query(`
        SELECT 
            mm.*, mua.durum as ucaylik_durum,
            mua.id AS ucaylik_id, mua.p_ucaylik, mua.g_ucaylik, 
          json_agg(mbd_ucaylik.*) AS ucaylik_bakim
        FROM 
            main_machines mm
       
        LEFT JOIN 
            machines_ucaylik mua ON mua.machines_id = mm.id 
       
        
      
        LEFT JOIN 
            machine_bakim_detail mbd_ucaylik ON mua.id = mbd_ucaylik.bakim_id
      WHERE mm.id = ${machine_id}
        GROUP BY 
            mm.id, 
            mua.id, mua.p_ucaylik, mua.g_ucaylik
            `);
        data = result.rows;
        break;
      case 6:
        console.log("alti aylik çalışacak")
        result = await pool.query(`  SELECT 
            mm.*,maa.durum as alti_durum,
           
            
            maa.id AS altiaylik_id, maa.p_altiaylik, maa.g_altiaylik, 
           
            json_agg(mbd_altiaylik.*) AS altiaylik_bakim
         
        FROM 
            main_machines mm
       
        LEFT JOIN 
            machines_altiaylik maa ON maa.machines_id = mm.id
     
        LEFT JOIN 
            machine_bakim_detail mbd_altiaylik ON maa.id = mbd_altiaylik.bakim_id
       WHERE mm.id = ${machine_id}
        GROUP BY 
            mm.id,
            maa.id, maa.p_altiaylik, maa.g_altiaylik
           `);
        data = result.rows;
        break;
      case 12:
        result = await pool.query(`
        SELECT 
            mm.*, my.durum as yillik_durum,
           
            my.id AS yillik_id, my.p_yillik, my.g_yillik, 
           
          json_agg(mbd_yillikaylik.*)as yillik_bakim
        FROM 
            main_machines mm
       
        LEFT JOIN 
            machines_yillik my ON my.machines_id = mm.id 
       
        LEFT JOIN 
            machine_bakim_detail mbd_yillikaylik ON my.id = mbd_yillikaylik.bakim_id WHERE mm.id = ${machine_id}
        GROUP BY 
            mm.id, 
            my.id, my.p_yillik, my.g_yillik`);
        data = result.rows;
        break;
      case 0:
        result = await pool.query(`
        SELECT 
        mm.*, mar.durum as ariza_durum,
       
        mar.id AS ariza_id, mar.ariza_tarih, mar.g_tarih,
      json_agg(mar_detail.*)as ariza_bakim
    FROM 
        main_machines mm
   
    LEFT JOIN 
    machines_ariza mar ON mar.machines_id = mm.id 
   
    LEFT JOIN 
        machine_bakim_detail mar_detail ON mar.id = mar_detail.bakim_id AND mar_detail.type=0 WHERE mm.id = ${machine_id}
    GROUP BY 
        mm.id, 
        mar.id, mar.ariza_tarih, mar.g_tarih`);
        data = result.rows;
        break;

      default:
        break;
    }

    res.status(200).json({ status: 200, data: data });


  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
})
router.post('/putAylikMachinesOnarim', cors(), async (req, res) => {
  const { type, machine_id, bakim_turu, bakim_tarihi, ariza_id, bakim_aciklama, bakim_tur_name, bakim_detail, bakim_durumu, user_id, user_name } = req.body
  const tarihParcalari = bakim_tarihi.split('-');

  const yil = parseInt(tarihParcalari[2], 10);
  const ay = parseInt(tarihParcalari[1], 10) - 1;
  const gun = parseInt(tarihParcalari[0], 10);

  const tarih = new Date(yil, ay, gun);
  tarih.setDate(tarih.getDate() + (type * 30));
  const yeniTarih = `${tarih.getDate()}.${tarih.getMonth() + 1}.${tarih.getFullYear()}`;
  console.log('Yeni Tarih:', yeniTarih);
  let type_name
  switch (type) {
    case 1://1 aylık
      type_name = "Aylik"
      if (bakim_durumu == 0) { // bakim tamamlanmadığı durumda
        const selectMachineAylik = await pool.query(`SELECT id FROM machines_aylik WHERE durum=0 AND machines_id = ${machine_id}`)


        if (selectMachineAylik.rows.length > 0) { // makina için bir değer atanmış ise çalışacak
          const selectMachineId = selectMachineAylik.rows[0].id
          const updateMachineAylik = await pool.query(`Update machines_aylik SET g_aylik = '${bakim_tarihi}' WHERE durum = 0 and machines_id = ${machine_id}`)
          const insertMachineDetail = await pool.query(`
            INSERT INTO machine_bakim_detail(
            type, user_id, user_name, bakim_turu, bakim_tarihi, aciklama, bakim_detail, type_name, bakim_tur_name, bakim_id,machine_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10,$11)`,
            [type, user_id, user_name, bakim_turu, bakim_tarihi, bakim_aciklama, bakim_detail, type_name, bakim_tur_name, selectMachineId, machine_id]);

        } else {  // makina için daha önce bir planlanan bakım olmadığında çalışacak
          const insertMAchineAylik = await pool.query(`
      INSERT INTO machines_aylik(p_aylik,  machines_id, durum)
      VALUES ('${yeniTarih}', ${machine_id}, 0)
      RETURNING id;
  `);
          selectMachineId = insertMAchineAylik.rows[0].id
          const insertMachineDetail = await pool.query(`
            INSERT INTO machine_bakim_detail(
            type, user_id, user_name, bakim_turu, bakim_tarihi, aciklama, bakim_detail, type_name, bakim_tur_name, bakim_id,machine_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10,$11)`,
            [type, user_id, user_name, bakim_turu, bakim_tarihi, bakim_aciklama, bakim_detail, type_name, bakim_tur_name, selectMachineId, machine_id]);

        }

      } else {//bakim tamamlandığında
        const selectMachineAylik = await pool.query(`SELECT id FROM machines_aylik WHERE durum=0 AND machines_id = ${machine_id}`)

        if (selectMachineAylik.rows.length > 0) { // makina için bir değer atanmış ise çalışacak
          const selectMachineId = selectMachineAylik.rows[0].id
          const updateMachineAylik = await pool.query(`Update machines_aylik SET g_aylik = '${bakim_tarihi}' , durum = 1 WHERE durum = 0 and machines_id = ${machine_id}`)
          const insertMachineDetail = await pool.query(`
            INSERT INTO machine_bakim_detail(
            type, user_id, user_name, bakim_turu, bakim_tarihi, aciklama, bakim_detail, type_name, bakim_tur_name, bakim_id,machine_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10,$11)`,
            [type, user_id, user_name, bakim_turu, bakim_tarihi, bakim_aciklama, bakim_detail, type_name, bakim_tur_name, selectMachineId, machine_id]);


          const insertMAchineAylik = await pool.query(`INSERT INTO machines_aylik(
              p_aylik,  machines_id, durum)
              VALUES ('${yeniTarih}', ${machine_id}, 0);`)
        } else {  // makina için daha önce bir planlanan bakım olmadığında çalışacak
          const insertMAchineAylik = await pool.query(`
            INSERT INTO machines_aylik(p_aylik,  machines_id, durum)
            VALUES ('${yeniTarih}', ${machine_id}, 0)
            RETURNING id;
        `);
          selectMachineId = insertMAchineAylik.rows[0].id
          const insertMachineDetail = await pool.query(`
            INSERT INTO machine_bakim_detail(
            type, user_id, user_name, bakim_turu, bakim_tarihi, aciklama, bakim_detail, type_name, bakim_tur_name, bakim_id,machine_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10,$11)`,
            [type, user_id, user_name, bakim_turu, bakim_tarihi, bakim_aciklama, bakim_detail, type_name, bakim_tur_name, selectMachineId, machine_id]);


        }


      }

      break;
    case 3://3 aylık
      type_name = "Üç Aylik"
      if (bakim_durumu == 0) { // bakim tamamlanmadığı durumda
        const selectMachineAylik = await pool.query(`SELECT id FROM machines_ucaylik WHERE durum=0 AND machines_id = ${machine_id}`)


        if (selectMachineAylik.rows.length > 0) { // makina için bir değer atanmış ise çalışacak
          const selectMachineId = selectMachineAylik.rows[0].id
          const updateMachineAylik = await pool.query(`Update machines_ucaylik SET g_ucaylik = '${bakim_tarihi}' WHERE durum = 0 and machines_id = ${machine_id}`)
          const insertMachineDetail = await pool.query(`
          INSERT INTO machine_bakim_detail(
          type, user_id, user_name, bakim_turu, bakim_tarihi, aciklama, bakim_detail, type_name, bakim_tur_name, bakim_id,machine_id)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10,$11)`,
            [type, user_id, user_name, bakim_turu, bakim_tarihi, bakim_aciklama, bakim_detail, type_name, bakim_tur_name, selectMachineId, machine_id]);

        } else {  // makina için daha önce bir planlanan bakım olmadığında çalışacak
          const insertMAchineAylik = await pool.query(`
    INSERT INTO machines_ucaylik(p_ucaylik,  machines_id, durum)
    VALUES ('${yeniTarih}', ${machine_id}, 0)
    RETURNING id;
  `);
          selectMachineId = insertMAchineAylik.rows[0].id
          const insertMachineDetail = await pool.query(`
          INSERT INTO machine_bakim_detail(
          type, user_id, user_name, bakim_turu, bakim_tarihi, aciklama, bakim_detail, type_name, bakim_tur_name, bakim_id,machine_id)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10,$11)`,
            [type, user_id, user_name, bakim_turu, bakim_tarihi, bakim_aciklama, bakim_detail, type_name, bakim_tur_name, selectMachineId, machine_id]);

        }

      } else {//bakim tamamlandığında
        const selectMachineAylik = await pool.query(`SELECT id FROM machines_ucaylik WHERE durum=0 AND machines_id = ${machine_id}`)

        if (selectMachineAylik.rows.length > 0) { // makina için bir değer atanmış ise çalışacak
          const selectMachineId = selectMachineAylik.rows[0].id
          const updateMachineAylik = await pool.query(`Update machines_ucaylik SET g_ucaylik = '${bakim_tarihi}' , durum = 1 WHERE durum = 0 and machines_id = ${machine_id}`)
          const insertMachineDetail = await pool.query(`
          INSERT INTO machine_bakim_detail(
          type, user_id, user_name, bakim_turu, bakim_tarihi, aciklama, bakim_detail, type_name, bakim_tur_name, bakim_id,machine_id)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10,$11)`,
            [type, user_id, user_name, bakim_turu, bakim_tarihi, bakim_aciklama, bakim_detail, type_name, bakim_tur_name, selectMachineId, machine_id]);


          const insertMAchineAylik = await pool.query(`INSERT INTO machines_ucaylik(
            p_ucaylik,  machines_id, durum)
            VALUES ('${yeniTarih}', ${machine_id}, 0);`)
        } else {  // makina için daha önce bir planlanan bakım olmadığında çalışacak
          const insertMAchineAylik = await pool.query(`
          INSERT INTO machines_ucaylik(p_ucaylik,  machines_id, durum)
          VALUES ('${yeniTarih}', ${machine_id}, 0)
          RETURNING id;
      `);
          selectMachineId = insertMAchineAylik.rows[0].id
          const insertMachineDetail = await pool.query(`
            INSERT INTO machine_bakim_detail(
            type, user_id, user_name, bakim_turu, bakim_tarihi, aciklama, bakim_detail, type_name, bakim_tur_name, bakim_id,machine_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10,$11)`,
            [type, user_id, user_name, bakim_turu, bakim_tarihi, bakim_aciklama, bakim_detail, type_name, bakim_tur_name, selectMachineId, machine_id]);


        }


      }
      break;
    case 6://6 aylık
      type_name = "Altı Aylik"
      if (bakim_durumu == 0) { // bakim tamamlanmadığı durumda
        const selectMachineAylik = await pool.query(`SELECT id FROM machines_altiaylik WHERE durum=0 AND machines_id = ${machine_id}`)


        if (selectMachineAylik.rows.length > 0) { // makina için bir değer atanmış ise çalışacak
          const selectMachineId = selectMachineAylik.rows[0].id
          const updateMachineAylik = await pool.query(`Update machines_altiaylik SET g_altiaylik = '${bakim_tarihi}' WHERE durum = 0 and machines_id = ${machine_id}`)
          const insertMachineDetail = await pool.query(`
          INSERT INTO machine_bakim_detail(
          type, user_id, user_name, bakim_turu, bakim_tarihi, aciklama, bakim_detail, type_name, bakim_tur_name, bakim_id,machine_id)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10,$11)`,
            [type, user_id, user_name, bakim_turu, bakim_tarihi, bakim_aciklama, bakim_detail, type_name, bakim_tur_name, selectMachineId, machine_id]);

        } else {  // makina için daha önce bir planlanan bakım olmadığında çalışacak
          const insertMAchineAylik = await pool.query(`
    INSERT INTO machines_altiaylik(p_altiaylik,  machines_id, durum)
    VALUES ('${yeniTarih}', ${machine_id}, 0)
    RETURNING id;
  `);
          selectMachineId = insertMAchineAylik.rows[0].id
          const insertMachineDetail = await pool.query(`
          INSERT INTO machine_bakim_detail(
          type, user_id, user_name, bakim_turu, bakim_tarihi, aciklama, bakim_detail, type_name, bakim_tur_name, bakim_id,machine_id)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10,$11)`,
            [type, user_id, user_name, bakim_turu, bakim_tarihi, bakim_aciklama, bakim_detail, type_name, bakim_tur_name, selectMachineId, machine_id]);

        }

      } else {//bakim tamamlandığında
        const selectMachineAylik = await pool.query(`SELECT id FROM machines_altiaylik WHERE durum=0 AND machines_id = ${machine_id}`)

        if (selectMachineAylik.rows.length > 0) { // makina için bir değer atanmış ise çalışacak
          const selectMachineId = selectMachineAylik.rows[0].id
          const updateMachineAylik = await pool.query(`Update machines_altiaylik SET g_altiaylik = '${bakim_tarihi}' , durum = 1 WHERE durum = 0 and machines_id = ${machine_id}`)
          const insertMachineDetail = await pool.query(`
            INSERT INTO machine_bakim_detail(
            type, user_id, user_name, bakim_turu, bakim_tarihi, aciklama, bakim_detail, type_name, bakim_tur_name, bakim_id,machine_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10,$11)`,
            [type, user_id, user_name, bakim_turu, bakim_tarihi, bakim_aciklama, bakim_detail, type_name, bakim_tur_name, selectMachineId, machine_id]);


          const insertMAchineAylik = await pool.query(`INSERT INTO machines_altiaylik(
            p_altiaylik,  machines_id, durum)
            VALUES ('${yeniTarih}', ${machine_id}, 0);`)
        } else {  // makina için daha önce bir planlanan bakım olmadığında çalışacak
          const insertMAchineAylik = await pool.query(`
          INSERT INTO machines_altiaylik(p_altiaylik,  machines_id, durum)
          VALUES ('${yeniTarih}', ${machine_id}, 0)
          RETURNING id;
      `);
          selectMachineId = insertMAchineAylik.rows[0].id
          const insertMachineDetail = await pool.query(`
          INSERT INTO machine_bakim_detail(
          type, user_id, user_name, bakim_turu, bakim_tarihi, aciklama, bakim_detail, type_name, bakim_tur_name, bakim_id,machine_id)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10,$11)`,
            [type, user_id, user_name, bakim_turu, bakim_tarihi, bakim_aciklama, bakim_detail, type_name, bakim_tur_name, selectMachineId, machine_id]);

        }


      }
      break;
    case 12://12 aylık
      type_name = "Yıllık"
      if (bakim_durumu == 0) { // bakim tamamlanmadığı durumda
        const selectMachineAylik = await pool.query(`SELECT id FROM machines_yillik WHERE durum=0 AND machines_id = ${machine_id}`)


        if (selectMachineAylik.rows.length > 0) { // makina için bir değer atanmış ise çalışacak
          const selectMachineId = selectMachineAylik.rows[0].id
          const updateMachineAylik = await pool.query(`Update machines_yillik SET g_yillik = '${bakim_tarihi}' WHERE durum = 0 and machines_id = ${machine_id}`)
          const insertMachineDetail = await pool.query(`
          INSERT INTO machine_bakim_detail(
          type, user_id, user_name, bakim_turu, bakim_tarihi, aciklama, bakim_detail, type_name, bakim_tur_name, bakim_id,machine_id)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10,$11)`,
            [type, user_id, user_name, bakim_turu, bakim_tarihi, bakim_aciklama, bakim_detail, type_name, bakim_tur_name, selectMachineId, machine_id]);

        } else {  // makina için daha önce bir planlanan bakım olmadığında çalışacak
          const insertMAchineAylik = await pool.query(`
    INSERT INTO machines_yillik(p_yillik,  machines_id, durum)
    VALUES ('${yeniTarih}', ${machine_id}, 0)
    RETURNING id;
  `);
          selectMachineId = insertMAchineAylik.rows[0].id
          const insertMachineDetail = await pool.query(`
          INSERT INTO machine_bakim_detail(
          type, user_id, user_name, bakim_turu, bakim_tarihi, aciklama, bakim_detail, type_name, bakim_tur_name, bakim_id,machine_id)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10,$11)`,
            [type, user_id, user_name, bakim_turu, bakim_tarihi, bakim_aciklama, bakim_detail, type_name, bakim_tur_name, selectMachineId, machine_id]);

        }

      } else {//bakim tamamlandığında
        const selectMachineAylik = await pool.query(`SELECT id FROM machines_yillik WHERE durum=0 AND machines_id = ${machine_id}`)

        if (selectMachineAylik.rows.length > 0) { // makina için bir değer atanmış ise çalışacak
          const selectMachineId = selectMachineAylik.rows[0].id
          const updateMachineAylik = await pool.query(`Update machines_yillik SET g_yillik = '${bakim_tarihi}' , durum = 1 WHERE durum = 0 and machines_id = ${machine_id}`)
          const insertMachineDetail = await pool.query(`
          INSERT INTO machine_bakim_detail(
          type, user_id, user_name, bakim_turu, bakim_tarihi, aciklama, bakim_detail, type_name, bakim_tur_name, bakim_id,machine_id)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10,$11)`,
            [type, user_id, user_name, bakim_turu, bakim_tarihi, bakim_aciklama, bakim_detail, type_name, bakim_tur_name, selectMachineId, machine_id]);

          const insertMAchineAylik = await pool.query(`INSERT INTO machines_yillik(
            p_yillik,  machines_id, durum)
            VALUES ('${yeniTarih}', ${machine_id}, 0);`)
        } else {  // makina için daha önce bir planlanan bakım olmadığında çalışacak
          const insertMAchineAylik = await pool.query(`
          INSERT INTO machines_yillik(p_yillik,  machines_id, durum)
          VALUES ('${yeniTarih}', ${machine_id}, 0)
          RETURNING id;
      `);
          selectMachineId = insertMAchineAylik.rows[0].id
          const insertMachineDetail = await pool.query(`
          INSERT INTO machine_bakim_detail(
          type, user_id, user_name, bakim_turu, bakim_tarihi, aciklama, bakim_detail, type_name, bakim_tur_name, bakim_id,machine_id)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10,$11)`,
            [type, user_id, user_name, bakim_turu, bakim_tarihi, bakim_aciklama, bakim_detail, type_name, bakim_tur_name, selectMachineId, machine_id]);


        }


      }
      break;
    case 0://arıza
      type_name = "Ariza"
      //arızayı kayapacak 
      const updateAriza = await pool.query(`UPDATE machines_ariza SET durum = 0,g_tarih='${bakim_tarihi}' WHERE id = ${ariza_id}`)
      const updateMachine = await pool.query(`UPDATE main_machines SET durum = 0 WHERE id = ${machine_id}`)
      const insertArizaBakim = await pool.query(`INSERT INTO machine_bakim_detail ( type, user_id, user_name, bakim_turu, bakim_tarihi, aciklama, bakim_detail, type_name, bakim_tur_name, bakim_id,machine_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10,$11)`, [type, user_id, user_name, bakim_turu, bakim_tarihi, bakim_aciklama, bakim_detail, type_name, bakim_tur_name, ariza_id, machine_id])

      break;

    default:
      break;
  }

  //   type 1->aylik 2-> ucaylik 3-> altı aylik 4-> yillik 
  //   type 1       
  try {


    res.status(200).json({ status: 200 });


  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
})
router.post('/getMachinesBakim', cors(), async (req, res) => {

  try {


    const result = await pool.query(`SELECT * FROM main_machines `);
    const data = result.rows;


    res.status(200).json({ status: 200, data: data });


  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
})

router.post('/getKalibrasyonGecmis', cors(), async (req, res) => {
  try {
    const id = req.body.id
    const result = await pool.query(`SELECT qe.id,qe.ekipman_no,qe.ekipman_name,qe.ekipman_no,qe.ekipman_type,qe.sorumlusu, qe.son_kalibrasyon,qe.gonderme_tarihi,qs.name as durumu,qd.name as birimi,
       qc.sertifika_url,qc.kalibr_sertifika_no, qc.tolerans,qc.seri_no 
       FROM quailty_ekipman qe
       INNER JOIN quality_calibration qc ON qc.ekipman_no = qe.ekipman_no 
       Inner Join quality_status qs ON qs.id = qe.durumu 
       Inner Join quailty_departman qd ON qe.birimi = qd.id WHERE qe.id = ${id}`);
    const data = result.rows;
    res.status(200).json({ status: 200, data: data });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
})
router.post('/postKalibrasyonMetarial', cors(), async (req, res) => {
  try {
    const { ekipman_no, ekipman_name, ekipman_type, birimi, sorumlusu, durumu, son_kalibrasyon, gonderme_tarihi } = req.body
    const dataGet = await pool.query(`select* from quailty_ekipman WHERE ekipman_no = '${ekipman_no}'`);

    if (dataGet.rows.length === 0) {
      const result = await pool.query(`
      INSERT INTO quailty_ekipman (
          ekipman_no, ekipman_name, ekipman_type,
          birimi, sorumlusu, durumu,
          son_kalibrasyon, gonderme_tarihi
      ) 
      VALUES (
          '${ekipman_no}', '${ekipman_name}', '${ekipman_type}',
          '${birimi}', '${sorumlusu}', '${durumu}',
          '${son_kalibrasyon}', '${gonderme_tarihi}'
      ) 
  `);
      const data = result.rows;
      res.status(200).json({
        data: data,
        status: 200
      });
    } else {
      res.status(200).json({
        status: 205
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
})

router.post('/qrMachineSearch', cors(), async (req, res) => {
  const { machine_id, seri_no } = req.body;
  try {
    const quality_status = await pool.query(`SELECT * FROM main_machines WHERE id = ${machine_id} AND seri_no = ${seri_no}`);



    res.status(200).json({
      status: 200,
      quality_status: quality_status.rows,

    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
})

router.post('/postKalibrasyonDetail', cors(), async (req, res) => {
  try {
    const { ekipman_no, ekipman_name, ekipman_type, birimi, sorumlusu, durumu, son_kalibrasyon, gonderme_tarihi, seri_no, sertifika_url, kalibr_sertifika_no } = req.body
    const dataGet = await pool.query(`select* from quailty_ekipman WHERE ekipman_no = '${ekipman_no}'`);

    if (dataGet.rows.length !== 0) {
      const result = await pool.query(`
      INSERT INTO quality_calibration ( seri_no, birim, sertifika_url, kalibr_sertifika_no, tolerans, kalibrasyon_tarihi, geceme_tarihi, durumu,
          ekipman_no, ekipman_name, ekipman_type ) VALUES ('${seri_no}','${birimi}', '${sertifika_url}', '${kalibr_sertifika_no}','0'  ,'${son_kalibrasyon}', '${gonderme_tarihi}', '${durumu}','${ekipman_no}' , '${ekipman_name}', '${ekipman_type}') 
  `);
      const data = result.rows;


      if ((dataGet.rows[0].durumu == 1 && durumu == 3) || (dataGet.rows[0].durumu == 2 && durumu == 3) || (dataGet.rows[0].durumu == 3 && durumu == 3))//durum ve tarih güncelle
      {
        const updateData = await pool.query(`
          UPDATE quailty_ekipman
          SET durumu= '${durumu}', son_kalibrasyon='${son_kalibrasyon}', gonderme_tarihi='${gonderme_tarihi}'
          WHERE ekipman_no='${ekipman_no}'`);
      }
      if ((dataGet.rows[0].durumu == 1 && durumu == 2) || (dataGet.rows[0].durumu == 2 && durumu == 1) || (dataGet.rows[0].durumu == 3 && durumu == 1))//durum 
      {


        const updateData = await pool.query(`
          UPDATE quailty_ekipman
          SET durumu= '${durumu}'
          WHERE ekipman_no='${ekipman_no}'`);
      }
      res.status(270).json({
        data: data,
        status: 200
      });
    } else {
      res.status(270).json({
        status: 205
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
})
router.post('/getStatusAndDepartment', cors(), async (req, res) => {
  try {
    const quality_status = await pool.query(`select* from quality_status`);
    const quailty_departman = await pool.query(`select* from quailty_departman`);


    res.status(200).json({
      status: 200,
      quality_status: quality_status.rows,
      quailty_departman: quailty_departman.rows
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
})
router.post('/isListesi', cors(), async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM todo_list');
    const data = result.rows;
    res.status(200).json({ data });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
})

router.get('/qrKontrols', cors(), (req, res) => {

  const machineData = {
    machine_id: '2',
    seri_no: '413'
  };

  const qrData = JSON.stringify(machineData); // Verileri JSON formatına çeviriyoruz

  QRCode.toDataURL(qrData, (err, url) => {
    if (err) {
      console.error(err);
      return;
    }
    res.json(url); // QR kodunun veri URL'sini alıyoruz
    // Bu URL'ü kullanarak QR kodunu gösterebilir veya kaydedebilirsiniz
  });

});
const qrKontrol = async () => {
  // Burada sorgunuzu çalıştırabilirsiniz, örneğin:

  const machineData = {
    machine_id: '123',
    seri_no: 'ABC456'
  };

  const qrData = JSON.stringify(machineData); // Verileri JSON formatına çeviriyoruz

  QRCode.toDataURL(qrData, (err, url) => {
    if (err) {
      console.error(err);
      return;
    }
    return url; // QR kodunun veri URL'sini alıyoruz
    // Bu URL'ü kullanarak QR kodunu gösterebilir veya kaydedebilirsiniz
  });
};

module.exports = router;
