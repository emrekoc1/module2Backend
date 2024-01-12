const axios = require('axios');
const nodemailer = require("nodemailer");
const express = require('express');
const router = express.Router();
const cors = require('cors');
const { format } = require('date-fns');
const http = require('http');
const request = require('request')
router.use(cors());
const pool = require('./db');
const fs = require("fs")
router.get('/token', (req, res) => {
    getToken((error, access_token) => {
        if (error) {
            console.error(error);
            res.status(500).json({ error: 'Internal Server Error' });
            return;
        }

        res.json(access_token);
    });
});


let transformedSiparisler = []
function findSubcomponents(data, code, level = 0) {
    const subcomponents = [];
    for (const item of data) {
        if (item.KOD === code) {
            subcomponents.push({
                level,
                KOD: item.KOD,
                ALTMALZEME: item.ALTMALZEME,
                ALTKOD: item.ALTKOD,
                MIKTAR: item.MIKTAR,
                BIRIM: item.BIRIM,
            });
            if (item.ALTKOD) {
                const nestedSubcomponents = findSubcomponents(data, item.ALTKOD, level + 1);
                subcomponents.push(...nestedSubcomponents);
            }
        }
    }
    return subcomponents;
}
function findSubcomponents(data, code) {
    const subcomponents = [];
    for (const item of data) {
        if (item.KOD === code) {
            subcomponents.push({
                level,
                KOD: item.KOD,
                ALTMALZEME: item.ALTMALZEME,
                ALTKOD: item.ALTKOD,
                MIKTAR: item.MIKTAR,
                BIRIM: item.BIRIM,
            });
            if (item.ALTKOD) {
                const nestedSubcomponents = findSubcomponents(data, item.ALTKOD, level + 1);
                subcomponents.push(...nestedSubcomponents);
            }
        }
    }
    return subcomponents;
}
function getToken(callback) {
    const tokenOptions = {
        method: 'GET',
        url: 'http://20.0.0.14:32001/api/v1/token',
        headers: {
            Authorization: 'Basic TEVWRUxCSUxJU0lNOkdiVUNoeEU3elFUdzJYWWNjdHdzcTZTQkUzODdLQmF1dE94RWNScnR6cFE9',
            'Content-Type': 'application/json',
            Accept: 'application/json'
        },
        body: 'grant_type=password&username=level&firmno=224&password=l123456*'
    };

    request(tokenOptions, function (error, response, body) {

        if (error) {
            callback(error, null);

            return;
        }
        const access_token = JSON.parse(body); // access_token değerini al
        callback(null, access_token);
    });
}
function getToken2() {
    return new Promise((resolve, reject) => {
        const tokenOptions = {
            method: 'GET',
            url: 'http://20.0.0.14:32001/api/v1/token',
            headers: {
                Authorization: 'Basic TEVWRUxCSUxJU0lNOkdiVUNoeEU3elFUdzJYWWNjdHdzcTZTQkUzODdLQmF1dE94RWNScnR6cFE9',
                'Content-Type': 'application/json',
                Accept: 'application/json'
            },
            body: 'grant_type=password&username=level&firmno=224&password=l123456*'
        };

        request(tokenOptions, function (error, response, body) {
            if (error) {
                reject(error);
                return;
            }
            const access_token = JSON.parse(body); // access_token değerini al
            resolve(access_token);
        });
    });
}
router.post('/uretimEmriGet', cors(), (req, res) => {
    const code = req.body.code
    const code2 = req.body.code2
    let uretimEmri
    if (code !== null && code2 !== null) {
        getToken((error, access_token) => {
            if (error) {
                console.error(error);
                res.status(500).json({ error: 'Internal Server Error' });
                return;
            }

            const urlUretimEmri = `http://20.0.0.14:32001/api/v1/queries?tsql=SELECT * FROM PLANLAMA_URETIM_DETAY WHERE KOD1 = '${code}'  AND LPRODSTAT='0' AND TRCODE = '12' AND KOD2 = '${code2}' `; // API endpointini doğru şekilde belirtin
            const optionsUretimEmri = {
                method: 'GET',
                url: urlUretimEmri,
                headers: {
                    Authorization: `Bearer ${access_token.access_token}`,
                    'Content-Type': 'application/json',
                    Accept: 'application/json'
                }
            };
            request(optionsUretimEmri, function (error, response, body) {
                if (error) {
                    console.error(error);
                    res.status(500).json({ error: 'Internal Server Error' });
                    return;
                }

                const parsedBody = JSON.parse(body);

                uretimEmriParse = parsedBody.items || []; // "items" özelliğini kullanarak sipariş verilerini alın
                const acikSiparisler = uretimEmriParse.filter(siparis => {
                    // Varsayılan olarak, 'TARİH' alanındaki değer 'gg.aa.yyyy' formatında
                    const tarih = siparis['FICHENO'];

                    // Eğer tarih 'gg.aa.yyyy' formatında değilse veya 'TARİH' boşsa bu öğeyi filtre dışı bırak



                    return siparis['KOD1'] !== null && tarih !== null && siparis['KOD2'] !== null;
                });
                res.json(acikSiparisler);

                // İşlenen veriyi JSON olarak yanıt olarak gönderin
            });

        });
    }
});
router.post('/getSat', cors(), (req, res) => {
    const code = req.body.code
    const code2 = req.body.code2
    getToken((error, access_token) => {
        if (error) {
            console.error(error);
            res.status(500).json({ error: 'Internal Server Error' });
            return;
        }

        const encodedQuery = encodeURIComponent(`SELECT * FROM [PLANLAMA_TALEP_SIPARIS_224] WHERE [TALEP DURUMU] <> 'KARŞILANDI' AND [SİPARİŞ NO]=null  AND [MALZEME KODU]='${code}'`);
        const url = `http://20.0.0.14:32001/api/v1/queries?tsql=${encodedQuery}`;
        const options = {
            method: 'GET',
            url: url,
            headers: {
                Authorization: `Bearer ${access_token.access_token}`,
                'Content-Type': 'application/json',
                Accept: 'application/json'
            }
        };
        request(options, function (error, response, body) {
            if (error) {
                console.error(error);
                res.status(500).json({ error: 'Internal Server Error' });
                return;
            }

            const parsedBody = JSON.parse(body);

            siparisler = parsedBody.items || []; // "items" özelliğini kullanarak sipariş verilerini alın


            res.json(siparisler); // İşlenen veriyi JSON olarak yanıt olarak gönderin
        });
    });
});
router.post('/bomCek2', cors(), async (req, res) => {
    try {
        const { ay_1, ay_2, ay_3, ay_4, ay_5, ay_6, ay_7, ay_8, ay_9, ay_10, ay_11, ay_12, diger } = req.body;
        let code = req.body.code.toString()
        const access_token = await getToken2();
        const initialUrl = `http://20.0.0.14:32001/api/v1/queries?tsql=SELECT * FROM BOM_SATIR_224() WHERE KOD = '${code}'`;
        const initialOptions = {
            method: 'GET',
            url: initialUrl,
            headers: {
                Authorization: `Bearer ${access_token.access_token}`,
                'Content-Type': 'application/json',
                Accept: 'application/json'
            }
        };

        const initialResponse = await axios(initialOptions);
        let bomlist = initialResponse.data.items || [];

        for (const element of bomlist) {

            element.level = 0; // Ana elemanlar için level 0
            if (element.BOMAD2 != null) {
                const subComponentUrl = `http://20.0.0.14:32001/api/v1/queries?tsql=SELECT * FROM BOM_SATIR_224() WHERE KOD = '${element.ALTKOD}'`;
                const subComponentOptions = {
                    method: 'GET',
                    url: subComponentUrl,
                    headers: {
                        Authorization: `Bearer ${access_token.access_token}`,
                        'Content-Type': 'application/json',
                        Accept: 'application/json'
                    }
                };

                const subComponentResponse = await axios(subComponentOptions);
                const subComponentData = subComponentResponse.data.items || [];
                subComponentData.forEach(subElement => {
                    subElement.level = 1; // Alt elemanlar için level 1

                });
                bomlist = bomlist.concat(subComponentData);
            }
        }
        for (const element of bomlist) {
            if (element.level == 1 && element.BOMAD2 != null) {
                const subComponentUrl = `http://20.0.0.14:32001/api/v1/queries?tsql=SELECT * FROM BOM_SATIR_224() WHERE KOD = '${element.ALTKOD}'`;
                const subComponentOptions = {
                    method: 'GET',
                    url: subComponentUrl,
                    headers: {
                        Authorization: `Bearer ${access_token.access_token}`,
                        'Content-Type': 'application/json',
                        Accept: 'application/json'
                    }
                };

                const subComponentResponse = await axios(subComponentOptions);
                const subComponentData = subComponentResponse.data.items || [];
                subComponentData.forEach(subElement => {
                    subElement.level = 2; // Alt elemanlar için level 1

                });
                bomlist = bomlist.concat(subComponentData);
            }

        }
        for (const element of bomlist) {
            if (element.level === 2 && element.BOMAD2 != null && element.level != 1) {
                const subComponentUrl = `http://20.0.0.14:32001/api/v1/queries?tsql=SELECT * FROM BOM_SATIR_224() WHERE KOD = '${element.ALTKOD}'`;
                const subComponentOptions = {
                    method: 'GET',
                    url: subComponentUrl,
                    headers: {
                        Authorization: `Bearer ${access_token.access_token}`,
                        'Content-Type': 'application/json',
                        Accept: 'application/json'
                    }
                };

                const subComponentResponse = await axios(subComponentOptions);
                const subComponentData = subComponentResponse.data.items || [];
                subComponentData.forEach(subElement => {
                    subElement.level = 3; // Alt elemanlar için level 1

                });
                bomlist = bomlist.concat(subComponentData);
            }

        }

        // gelen Bom listi database kaydecek
        // eski bomu bul ve sil
        const selectBom = await pool.query(`Select * from target_bom WHERE siparis_urun = '${code}'`)
        if (selectBom.rowCount > 0) {
            const deleteBom = await pool.query(`DELETE FROM target_bom WHERE siparis_urun = '${code}'`)
        }

        // yenisini insert edilecek
        bomlist.forEach(async element => {
            const insertNewBom = await pool.query(`INSERT INTO target_bom(
          ust_kod, ust_malzeme, kod, malzeme, miktar, birim, seviye, ay_1, ay_2, ay_3, ay_4, ay_5, ay_6, ay_7, ay_8, ay_9, ay_10, ay_11, ay_12, diger, siparis_urun)
         VALUES ('${element.KOD}',' ${element.MALZEME}', '${element.ALTKOD}', '${element.ALTMALZEME}', ${element.MIKTAR}, '${element.BIRIM}', ${element.level}, ${ay_1}, ${ay_2},
           ${ay_3}, ${ay_4}, ${ay_5}, ${ay_6}, ${ay_7}, ${ay_8}, ${ay_9}, ${ay_10}, ${ay_11}, ${ay_12}, ${diger}, '${code}')`)
        });




        res.json({
            bomlist: bomlist,
            status: 200
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.post('/operasyonSureli2', cors(), async (req, res) => {

    const jsonBomList = fs.readFileSync('mrpuretim.json', 'utf8');
    const sqlData = JSON.parse(jsonBomList);

    try {
        const dataBom = []

        for (let index = 0; index < sqlData.length; index++) {

            const desiredId = sqlData[index].ROUT_CODE;
            const rotaData = await rotuerGet(desiredId); // ID parametresini gönderin
            console.log(rotaData)

            for (let element = 0; element < rotaData.length; element++) {
                dataBom.push(
                    {
                        code: sqlData[index].CODE,
                        NAME: sqlData[index].NAME,
                        urunKodu: sqlData[index].urunKodu,
                        urunaciklamasi: sqlData[index].urunaciklamasi,
                        VALIDREVREF: sqlData[index].VALIDREVREF,
                        VALIDREVREF: sqlData[index].VALIDREVREF,
                        BOMMASTERREF: sqlData[index].BOMMASTERREF,
                        REV_DATA_REFERENCE: sqlData[index].REV_DATA_REFERENCE,
                        MP_CODE: sqlData[index].MP_CODE,
                        MP_NAME: sqlData[index].MP_NAME,
                        ROUT_CODE: sqlData[index].ROUT_CODE,
                        ROUT_NAME: sqlData[index].ROUT_NAME,
                        INTERNAL_REFERENCE: sqlData[index].INTERNAL_REFERENCE,
                        DATA_REFERENCE: sqlData[index].DATA_REFERENCE,
                        LOGICALREF: sqlData[index].LOGICALREF,
                        DATA_REFERENCE: sqlData[index].DATA_REFERENCE,
                        LINENO_: rotaData[element].LINENO_,
                        istasyonname: rotaData[element].istasyonname,
                        istasyonkod: rotaData[element].istasyonkod,
                        op_code: rotaData[element].op_code,
                        kuyrukZaman: rotaData[element].kuyrukZaman,
                        kontrolzaman: rotaData[element].kontrolzaman,
                        iscilikSuresi: rotaData[element].islemzaman,
                        islem_miktari: rotaData[element].islem_miktari,
                        oponcesibekleme: rotaData[element].makinazamani,
                        makinazamani: rotaData[element].oponcesibekleme,
                        makinapartimiktari: rotaData[element].makinapartimiktari
                    }
                )
            }

        }




        res.json(dataBom);

    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});
router.post('/itemsBomGetir', cors(), async (req, res) => {

    const jsonBomList = fs.readFileSync('mrpuretim.json', 'utf8');
    const sqlData = JSON.parse(jsonBomList);

    try {
        const dataBom = []

        for (let index = 0; index < sqlData.length; index++) {
            const desiredId = sqlData[index].urunRef;
            const bomData = await itemsBul(desiredId); // ID parametresini gönderin


            dataBom.push({
                LOGICALREF: bomData[0].LOGICALREF
            })

        }






        res.json(dataBom);

    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});
router.post('/operasyonSureli', cors(), async (req, res) => {

    const jsonBomList = fs.readFileSync('veri.json', 'utf8');
    const sqlData = JSON.parse(jsonBomList);

    try {
        const dataBom = []

        for (let index = 0; index < sqlData.length; index++) {
            const desiredId = sqlData[index].BOMREF;
            const bomData = await bomListFonksiyon(desiredId); // ID parametresini gönderin


            dataBom.push(
                {
                    code: bomData.CODE,
                    urunKodu: sqlData[index].MALZEMEkOD,
                    urunaciklamasi: sqlData[index].ACİKLAMA,
                    NAME: bomData.NAME,
                    VALIDREVREF: bomData.VALIDREVREF,
                    VALIDREVREF: bomData.VALIDREVREF,
                    BOMMASTERREF: bomData.BOMMASTERREF,
                    REV_DATA_REFERENCE: bomData.REV_DATA_REFERENCE,
                    MP_CODE: bomData.MP_CODE,
                    MP_NAME: bomData.MP_NAME,
                    ROUT_CODE: bomData.ROUT_CODE,
                    ROUT_NAME: bomData.ROUT_NAME,
                    INTERNAL_REFERENCE: bomData.INTERNAL_REFERENCE,
                    DATA_REFERENCE: bomData.DATA_REFERENCE,
                    LOGICALREF: bomData.LOGICALREF,
                    DATA_REFERENCE: bomData.DATA_REFERENCE,

                }
            )

        }


        // operasyonData = []
        // for (let index = 0; index < dataBom.length; index++) {
        //   const rotaData = await rotuerGet(bomData[index].MP_CODE); // ID parametresini gönderin

        //   for (let element = 0; element < rotaData.length; element++) {
        //     operasyonData.push(
        //       {
        //         code: dataBom[index].CODE,
        //         NAME: dataBom[index].NAME,
        //         VALIDREVREF: dataBom[index].VALIDREVREF,
        //         VALIDREVREF: dataBom[index].VALIDREVREF,
        //         BOMMASTERREF: dataBom[index].BOMMASTERREF,
        //         REV_DATA_REFERENCE: dataBom[index].REV_DATA_REFERENCE,
        //         MP_CODE: dataBom[index].MP_CODE,
        //         MP_NAME: dataBom[index].MP_NAME,
        //         ROUT_CODE: dataBom[index].ROUT_CODE,
        //         ROUT_NAME: dataBom[index].ROUT_NAME,
        //         INTERNAL_REFERENCE: dataBom[index].INTERNAL_REFERENCE,
        //         DATA_REFERENCE: dataBom[index].DATA_REFERENCE,
        //         LOGICALREF: dataBom[index].LOGICALREF,
        //         DATA_REFERENCE: dataBom[index].DATA_REFERENCE,
        //         LINENO_: rotaData[element].LINENO_,
        //         istasyonname: rotaData[element].istasyonname,
        //         istasyonkod: rotaData[element].istasyonkod,
        //         op_code: rotaData[element].op_code,
        //         kuyrukZaman: rotaData[element].kuyrukZaman,
        //         kontrolzaman: rotaData[element].kontrolzaman,
        //         islemzaman: rotaData[element].islemzaman,
        //         oponcesibekleme: rotaData[element].oponcesibekleme
        //       }
        //     )

        //   }

        // }



        res.json(dataBom);

    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});
async function itemsBul(id) {
    try {
        const access_token = await getToken2(); // getToken2 fonksiyonu tanımlı olmalı ve await ile kullanılmalı
        // const initialUrl = `http://20.0.0.14:32001/api/v1/queries?tsql=SELECT * FROM LG_224_BOMASTER boms WHERE boms.MAINPRODREF = ${id}'`; // id parametresi kullanılmalı
        const initialUrl = `http://20.0.0.14:32001/api/v1/queries?tsql=SELECT bomss.* FROM LG_224_BOMASTER bomss where  bomss.MAINPRODREF = '${id}'`; // id parametresi kullanılmalı

        const initialOptions = {
            method: 'GET',
            url: initialUrl,
            headers: {
                Authorization: `Bearer ${access_token.access_token}`,
                'Content-Type': 'application/json',
                Accept: 'application/json'
            }
        };
        const initialResponse = await axios(initialOptions);
        let router = initialResponse.data.items || [];
        return router; // resolve yerine return kullanılmalı
    } catch (error) {
        console.error(error);
        throw error; // Hata yakalandığında işlenmeli veya fırlatılmalı
    }
}
async function rotuerGet(id) {
    try {
        const access_token = await getToken2(); // getToken2 fonksiyonu tanımlı olmalı ve await ile kullanılmalı
        const initialUrl = `http://20.0.0.14:32001/api/v1/queries?tsql=SELECT 
        rotl.*,worksta.NAME as istasyonname,worksta.CODE as istasyonkod,
        oper.CODE as op_code,opq.QUETIME as kuyrukZaman,opq.INSPTIME as kontrolzaman,opq.RUNTIME as islemzaman,opq.BATCHQUANTITY as islem_miktari,opq.WAITBATCHTIME as makinazamani,opq.WAITBATCHQTY as makinapartimiktari,opq.HEADTIME as oponcesibekleme FROM LG_224_ROUTING rot INNER JOIN LG_224_RTNGLINE rotl ON rot.LOGICALREF = rotl.ROUTINGREF INNER JOIN LG_224_OPERTION oper ON rotl.OPERATIONREF = oper.LOGICALREF INNER JOIN LG_224_OPRTREQ opq ON oper.LOGICALREF= opq.OPERATIONREF INNER JOIN LG_224_WORKSTAT worksta ON worksta.LOGICALREF=opq.WSREF AND rot.CODE = '${id}'`; // id parametresi kullanılmalı
        const initialOptions = {
            method: 'GET',
            url: initialUrl,
            headers: {
                Authorization: `Bearer ${access_token.access_token}`,
                'Content-Type': 'application/json',
                Accept: 'application/json'
            }
        };
        const initialResponse = await axios(initialOptions);
        let router = initialResponse.data.items || [];
        return router; // resolve yerine return kullanılmalı
    } catch (error) {
        console.error(error);
        throw error; // Hata yakalandığında işlenmeli veya fırlatılmalı
    }
}

async function bomListFonksiyon(id) {
    try {
        const access_token = await getToken2(); // getToken2 fonksiyonu tanımlı olmalı ve await ile kullanılmalı
        const initialUrl = `http://20.0.0.14:32001/api/v1/boms/${id}`; // id parametresi kullanılmalı
        const initialOptions = {
            method: 'GET',
            url: initialUrl,
            headers: {
                Authorization: `Bearer ${access_token.access_token}`,
                'Content-Type': 'application/json',
                Accept: 'application/json'
            }
        };
        const initialResponse = await axios(initialOptions);
        let bomlist = initialResponse.data || [];
        return bomlist; // resolve yerine return kullanılmalı
    } catch (error) {
        console.error(error);
        throw error; // Hata yakalandığında işlenmeli veya fırlatılmalı
    }
}

router.post('/bomCek', cors(), (req, res) => {
    const { code } = req.body;
    getToken((error, access_token) => {
        if (error) {
            console.error(error);
            res.status(500).json({ error: 'Internal Server Error' });
            return;
        }
        const url = `http://20.0.0.14:32001/api/v1/queries?tsql=SELECT *FROM BOM_SATIR_224()`; // API endpointini doğru şekilde belirtin
        const options = {
            method: 'GET',
            url: url,
            headers: {
                Authorization: `Bearer ${access_token.access_token}`,
                'Content-Type': 'application/json',
                Accept: 'application/json'
            }
        };

        request(options, function (error, response, body) {
            if (error) {
                console.error(error);
                res.status(500).json({ error: 'Internal Server Error' });
                return;
            }

            const parsedBody = JSON.parse(body);
            bomlist = parsedBody.items || []; // "items" özelliğini kullanarak sipariş verilerini alın

            const result = findSubcomponents(bomlist, code);
            res.json(result);
        });
    });

});


function getTokenPromise() {
    return new Promise((resolve, reject) => {
        const tokenOptions = {
            method: 'GET',
            url: 'http://20.0.0.14:32001/api/v1/token',
            headers: {
                Authorization: 'Basic TEVWRUxCSUxJU0lNOkdiVUNoeEU3elFUdzJYWWNjdHdzcTZTQkUzODdLQmF1dE94RWNScnR6cFE9',
                'Content-Type': 'application/json',
                Accept: 'application/json'
            },
            body: 'grant_type=password&username=level&firmno=224&password=l123456*'
        };

        request(tokenOptions, function (error, response, body) {
            if (error) {
                reject(error);
                return;
            }
            const access_token = JSON.parse(body); // access_token değerini al
            resolve(access_token);
        });
    });
}

router.post('/targetPost', cors(), async (req, res) => {
    let resultBomList;
    const { ay, miktar, kod, cari, aciksiparis, bom, oncelik, onem } = req.body;

    // İlk olarak, var olan kayıtı kontrol edin
    pool.query('SELECT * FROM targettable WHERE "urunKod" = $1 AND ay = $2', [kod, ay], (error, result) => {
        if (error) {
            console.error(error);
            return res.status(500).json({ error: 'Internal Server Error' });
        }

        if (result.rows.length > 0) {
            // Kayıt varsa, miktarı ve gerçekleşeni güncelleyin
            pool.query(
                'UPDATE targettable SET hedef = $1, gercek = 0 WHERE "urunKod" = $2 AND ay = $3',
                [miktar, kod, ay],
                (updateError, updateResult) => {
                    if (updateError) {
                        console.error(updateError);
                        return res.status(500).json({ error: 'Internal Server Error' });
                    }
                    return res.status(200).json({ message: 'Veri başarıyla güncellendi' });
                }
            );
        } else {
            pool.query(
                'INSERT INTO targettable ("urunKod", cari, "acikSiparis", ay, hedef, gercek, onem, oncelik, kontrolet) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, false) RETURNING id',
                [kod, cari, aciksiparis, ay, miktar, 0, onem, oncelik],
                async (insertError, insertResult) => {
                    if (insertError) {
                        console.error(insertError);
                        return res.status(500).json({ error: 'Internal Server Error' });
                    }

                    const targetId = insertResult.rows[0].id; // Yeni eklenen 'id' değerini alın


                    // Şimdi 'target_bom' tablosuna veri ekleyin

                    const access_token = await getTokenPromise();

                    const url = `http://20.0.0.14:32001/api/v1/queries?tsql=SELECT *FROM BOM_SATIR_224()`;
                    const options = {
                        method: 'GET',
                        url: url,
                        headers: {
                            Authorization: `Bearer ${access_token.access_token}`,
                            'Content-Type': 'application/json',
                            Accept: 'application/json'
                        }
                    };

                    const body = await new Promise((resolve, reject) => {
                        request(options, (error, response, body) => {
                            if (error) {
                                reject(error);
                            } else {
                                resolve(body);
                            }
                        });
                    });

                    const parsedBody = JSON.parse(body);
                    bomlist = parsedBody.items || [];
                    resultBomList = findSubcomponents(bomlist, kod);
                    resultBomList.forEach(element => {
                        let ALTKOD = element.ALTKOD
                        let alturun = element.KOD
                        let bom_miktar = element.MIKTAR
                        let hedefIhtiyac = bom_miktar * miktar
                        let seviye = element.level

                        pool.query(
                            'INSERT INTO public.target_bom(anaurun, alturun, miktar, ay, siparis, hedef, seviye, alttakimkod, oncelik, onem, targetid) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)',
                            [kod, alturun, bom_miktar, ay, aciksiparis, hedefIhtiyac, seviye, ALTKOD, oncelik, onem, targetId],
                            (bomInsertError, bomInsertResult) => {
                                if (bomInsertError) {
                                    console.error(bomInsertError);
                                    return res.status(500).json({ error: 'Internal Server Error' });
                                }
                                return console.log("hata varmiyor")
                            }
                        );

                    });

                }
            );
        }
    });
});





const groupAndSumSiparisler = async (siparisler) => {
    const groupedSiparisler = {};
    try {
        const eskiSiparisleriSil = await pool.query(`DELETE FROM siparisler `);
    } catch (error) {
        console.error(error)
    }
    siparisler.forEach(async (siparis) => {
        const {
            'CARİ': cari,
            'SİPARİŞ NUMARASI': siparis_no,
            'MALZEME KODU': malzeme_kodu,
            'MALZEME AÇIKLAMASI': malzeme_aciklamasi,
            'SİPARİŞ ADETİ': siparis_adet,
            'AÇIK SİPARİŞ': acik_siparis,
            'SEVKEDİLEN ADET': sevk_adet,
            'TESLİM TARİHİ': teslim_tarih,
            'PROJE': proje
        } = siparis;

        const tarihParcalari = teslim_tarih.split('.');
        const ay = parseInt(tarihParcalari[1], 10);
        const yil = parseInt(tarihParcalari[2], 10);
        console.log(ay, "-", yil)
        let teslim_tarihi
        if ((yil <= 2024)) {
            teslim_tarihi = "ESKİBORC"
        } else {
            const aylar = [
                'Ocak',
                'Şubat',
                'Mart',
                'Nisan',
                'Mayıs',
                'Haziran',
                'Temmuz',
                'Ağustos',
                'Eylül',
                'Ekim',
                'Kasım',
                'Aralık'
            ];
            teslim_tarihi = aylar[ay - 1]
        }
        try {

            const result = await pool.query(`INSERT INTO siparisler (proje, siparis_no, teslim_tarihi, takim, malzeme, malzeme_adi, musteri, miktar, sevk_edilen, acik_siparis) VALUES('${proje}','${siparis_no}','${teslim_tarihi}',''
      ,'${malzeme_kodu}','${malzeme_aciklamasi}','${cari}','${siparis_adet}','${sevk_adet}','${acik_siparis}')`);
            const data = result.rows;

        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Internal Server Error' });
        }

    });

    return Object.values("data");
};
router.post('/iliskiliUrunler', cors(), async (req, res) => {
    const code = req.body.code;
    try {
        const result = await pool.query('SELECT ust_kod as urunKodu,ust_malzeme as takimAciklamasi,siparis_urun as satis_urun,birim,miktar,target_bom.* FROM target_bom WHERE kod = $1', [code]);
        const data = result.rows;
        res.status(200).json({ status: 200, data: data });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
})

router.post('/localSiparisGet', cors(), async (req, res) => {
    console.log("buraya geldi");
    try {
        const result = await pool.query('SELECT * FROM siparisler WHERE acik_siparis>0');
        const data = result.rows;
        res.status(200).json({ status: 200, data: data });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
router.post('/localSiparisGetSingle', cors(), async (req, res) => {
    const proje = req.body.proje
    try {
        const result = await pool.query(`SELECT * FROM siparisler WHERE proje = '${proje}' AND acik_siparis > 0`);
        const data = result.rows;
        res.status(200).json({ status: 200, data: data });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
})

router.get('/satinAlma', cors(), (req, res) => {
    getToken((error, access_token) => {
        if (error) {
            console.error(error);
            res.status(500).json({ error: 'Internal Server Error' });
            return;
        }

        const url = `http://20.0.0.14:32001/api/v1/queries?tsql=SELECT *FROM SATINALMA_SIPARIS_224 `; // API endpointini doğru şekilde belirtin
        const options = {
            method: 'GET',
            url: url,
            headers: {
                Authorization: `Bearer ${access_token.access_token}`,
                'Content-Type': 'application/json',
                Accept: 'application/json'
            }
        };
        request(options, function (error, response, body) {
            if (error) {
                console.error(error);
                res.status(500).json({ error: 'Internal Server Error' });
                return;
            }

            const parsedBody = JSON.parse(body);
            siparisler = parsedBody.items || []; // "items" özelliğini kullanarak sipariş verilerini alın


            res.json(siparisler); // İşlenen veriyi JSON olarak yanıt olarak gönderin
        });
    });
});
router.get('/siparisler/search', cors(), (req, res) => {
    const keyword = req.query.keyword ? req.query.keyword.toLowerCase() : '';
    const filteredSiparisler = transformedSiparisler.filter((siparis) => {
        const malzemeKodu = siparis.MALZEME_KODU ? siparis.MALZEME_KODU.toLowerCase() : '';
        const malzemeAciklamasi = siparis.MALZEME_AÇIKLAMASI ? siparis.MALZEME_AÇIKLAMASI.toLowerCase() : '';

        return malzemeKodu.includes(keyword) || malzemeAciklamasi.includes(keyword);
    });

    const afilteredSiparisler = filteredSiparisler.map((siparis) => {
        const {
            'MALZEME_KODU': MALZEME_KODU,
            'CARI': CARI,
            'MALZEME_ACIKLAMASI': MALZEME_ACIKLAMASI,
            'TOPLAM_SIPARIS_ADETI': TOPLAM_SIPARIS_ADETI,
            'TOPLAM_ACIK_SIPARIS': TOPLAM_ACIK_SIPARIS,
            'TOPLAM_SEVK_EDILEN_ADET': TOPLAM_SEVK_EDILEN_ADET
        } = siparis;

        return {
            MALZEME_KODU,
            CARI,
            MALZEME_ACIKLAMASI,
            TOPLAM_SIPARIS_ADETI,
            TOPLAM_ACIK_SIPARIS,
            TOPLAM_SEVK_EDILEN_ADET
        };
    });
    res.json(afilteredSiparisler);
});
pool.connect((error, client, release) => {
    if (error) {
        console.error('Veritabanına bağlanılamadı:', error);
    } else {
        console.log('Veritabanına başarıyla bağlanıldı');
        release(); // Bağlantıyı serbest bırakın
    }
});

router.get('/projeksiyonData', cors(), async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM targettable');
        const data = result.rows;
        res.status(200).json({ data });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.get('/getMRP', cors(), async (req, res) => {
    try {

        let aylar = [
            "Ocak",
            "Şubat",
            "Mart",
            "Nisan",
            "Mayıs",
            "Haziran",
            "Temmuz",
            "Ağustos",
            "Eylül",
            "Ekim",
            "Kasım",
            "Aralık"
        ]
        let resultAmbar
        const sayiDizisi = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25];
        let kontrol = [];

        for (const ay of aylar) {
            for (const oncelik of sayiDizisi) {
                const result1 = await pool.query('SELECT "urunKod",ay,onem,oncelik FROM targettable WHERE ay = $1 AND onem*oncelik = $2', [ay, oncelik]);
                const urun_listesi = result1.rows;
                if (urun_listesi.length > 0) {
                    for (const liste of urun_listesi) {
                        const result2 = await pool.query('SELECT * FROM target_bom WHERE anaurun= $1 AND ay = $2 AND oncelik = $3 AND onem = $4', [liste.urunKod, liste.ay, liste.oncelik, liste.onem]);
                        const data = result2.rows;
                        kontrol.push(data);
                    }
                }
            }
        }

        const access_token = await getTokenPromise();
        const encodedUrl = `http://20.0.0.14:32001/api/v1/queries?tsql=${encodeURIComponent('SELECT * FROM AMBAR_TOPLAMLARI_224 WHERE MİKTAR >0 AND DEPO != \'Şube Tekrar Lens Deposu\' AND DEPO != \'AHO Hurda-Fire\' AND DEPO != \'Sevkiyat\' AND DEPO != \'Bakım Onarım Deposu\' AND DEPO != \'Ek Uygunsuzluk Deposu\' AND DEPO != \'İthalat Deposu\' AND DEPO != \'Aselsan Hurda-Fire Yansıtma\' AND DEPO != \'Rework Deposu\' AND DEPO != \'İade Deposu\' AND DEPO != \'Sabit Kıymet Deposu\' AND DEPO != \'Ankara AR-GE Üretim Deposu\' AND DEPO != \'Bilgi İşlem Deposu\' ')}`;

        const options = {
            method: 'GET',
            url: encodedUrl,
            headers: {
                Authorization: `Bearer ${access_token.access_token}`,
                'Content-Type': 'application/json',
                Accept: 'application/json'
            }
        };

        request(options, function (error, response, body) {
            if (error) {
                console.error(error);
                res.status(500).json({ error: 'Internal Server Error' });
                return;
            }
            const groupedData = {};
            const parsedBody = JSON.parse(body);
            resultAmbar = parsedBody.items || [];
            resultAmbar.forEach((item) => {
                const kodu = item.KODU; // Örneğin, KODU değeri buradan alınacak
                const miktar = item.MİKTAR; // Örneğin, MIKTAR değeri buradan alınacak
                // Gruplanan veri var mı diye kontrol edelim
                if (!groupedData[kodu]) {
                    // Kodu ile yeni bir grup oluştur
                    groupedData[kodu] = {
                        KODU: kodu,
                        TOPLAM_MIKTAR: miktar,
                    };
                } else {
                    // Grup varsa mevcut toplam miktarı güncelle
                    groupedData[kodu].TOPLAM_MIKTAR += miktar;
                }
            });
            const resultAmbar1 = Object.values(groupedData);
            kontrol.forEach(innerArray => {
                innerArray.forEach(async item => {
                    let anaurunAmbar = 0;
                    let altTakimAmbar = 0;
                    let alturunAmbar = 0;

                    resultAmbar1.forEach(ambars => {

                        if (ambars.KODU === item.anaurun) {

                            anaurunAmbar = ambars.TOPLAM_MIKTAR;

                        }
                        if (ambars.KODU === item.alturun) {
                            altTakimAmbar = ambars.TOPLAM_MIKTAR;
                        }
                        if (ambars.KODU === item.alttakimkod) {
                            alturunAmbar = ambars.TOPLAM_MIKTAR;
                        }
                    });

                    const kullanilabilir = (anaurunAmbar * item.miktar) + (altTakimAmbar * item.miktar) + (alturunAmbar)
                    const kalanUrun = (anaurunAmbar * item.miktar) + (altTakimAmbar * item.miktar) + (alturunAmbar) - item.hedef;

                    resultAmbar1.forEach(ambars => {
                        if (ambars.KODU === item.alttakimkod) {
                            ambars.TOPLAM_MIKTAR -= item.hedef;
                        }
                    });

                    item.depo_durumu = kalanUrun;
                    const result = await pool.query('UPDATE target_bom SET depodurumu = $3 , kullanilan_depo = $4 WHERE id=$1 and targetid=$2', [item.id, item.targetid, item.depo_durumu, kullanilabilir]);
                });
            });

            kontrol.forEach(innerArray => {
                innerArray.forEach(async item => {
                    if (item.depo_durumu < 0) {
                        const result = await pool.query('UPDATE targettable SET kontrolet = false WHERE id=$1', [item.targetid]);


                    }
                });
            });
            res.status(200).json({ kontrol });
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.get('/ayPojeGet/:id', cors(), async (req, res) => {
    const id = req.params.id;
    try {
        const result = await pool.query('SELECT alttakimkod as urun,alturun as usttakim, anaurun ,siparis,hedef, seviye,id, targetid ,depodurumu,ay,kullanilan_depo FROM target_bom WHERE targetid = $1', [id]);
        const data = result.rows;
        res.status(200).json({ data });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
})
router.get('/productDetail/:code', cors(), async (req, res) => {
    const id = req.params.code;
    try {

        const result = await pool.query('SELECT * FROM public.product_detail WHERE product_code = $1', [id]);
        const data = result.rows;

        res.status(200).json({ data });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
})

router.post('/getProductDetailAksiyon', cors(), async (req, res) => {
    try {

        const result = await pool.query(`SELECT * FROM product_detail_aksiyon WHERE product_detail_id = '${req.body.product_detail_id}'  `);
        const data = result.rows;

        res.status(200).json({ data });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
})
router.get('/productDetail', cors(), async (req, res) => {
    try {

        const result = await pool.query('SELECT * FROM public.product_detail ');
        const data = result.rows;

        res.status(200).json({ data });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
})

router.get('/eksikGet', cors(), async (req, res) => {
    const id = req.params.code;
    try {

        const result = await pool.query("SELECT tb.anaurun,    tb.alturun,    tb.miktar,    tb.ay,    tb.siparis,    tb.hedef,    tb.seviye,    tb.alttakimkod,    tb.oncelik,    tb.onem,    tb.id,    tb.targetid,    tb.depodurumu,    json_agg(json_build_object('id', pd.id,      'ay', pd.ay,      'cari', pd.cari,      'siparis_no', pd.siparis_no,      'aciklama', pd.aciklama,      'aciklama2', pd.aciklama2,      'termin', pd.termin,      'termin2', pd.termin2,      'product_code', pd.product_code,      'anaurunkodu', pd.anaurunkodu,      'urunadi', pd.urunadi    )) AS productdetail FROM target_bom AS tb LEFT JOIN product_detail AS pd ON tb.alttakimkod like pd.product_code where tb.depodurumu<0 GROUP BY tb.anaurun, tb.alturun, tb.miktar, tb.ay, tb.siparis, tb.hedef, tb.seviye, tb.alttakimkod, tb.oncelik, tb.onem, tb.id, tb.targetid, tb.depodurumu");
        const data = result.rows;

        res.status(200).json({ data });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
})
router.post('/productPost', cors(), async (req, res) => {
    const { id,
        tarih,
        miktar,
        qmiktar } = req.body;
    try {
        const result = await pool.query('INSERT INTO public.machine_product( machine_detail_id, product_date, quantity, qualtiy_quantity)VALUES ($1,$2, $3, $4)', [id, tarih, miktar, qmiktar]);
        const data = result.rows;
        res.status(200).json({ data });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
})
router.post('/postMachineDetail', cors(), async (req, res) => {
    const { id,
        detail_id,
        aciklama,
        urunkodu,
        islem,
        sure,
        calisan_is,
        miktar } = req.body;

    try {
        const putdetail = await pool.query('UPDATE machine_detail SET  bitti=1	WHERE id = $1', [detail_id]);
        const putData = putdetail.rows;
        const result = await pool.query('INSERT INTO machine_detail(machines_id, urunkodu, aciklamasi, uretim_suresi, islem_miktari, islem, bitti, hedef) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)', [id, urunkodu, aciklama, sure, islem, calisan_is, 0, miktar]);
        const data = result.rows;
        res.status(200).json({ data });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
})
router.post('/getprojectproductDetail', cors(), async (req, res) => {
    const data = req.body.malzeme

    try {

        const result = await pool.query(`select *from product_detail where siparis_urun = '${data}'`);
        const datas = result.rows;
        res.status(200).json({ datas: datas, status: 200 });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
})
router.post('/productDetailAksiyonPost', cors(), async (req, res) => {

    const { product_detail_id, aksiyon_aciklama, siparis_no, termin_tarih, termin_adet, cari } = req.body

    try {


        const updateEski = await pool.query(`UPDATE product_detail_aksiyon SET is_active = false WHERE product_detail_id = ${product_detail_id} AND siparis_no = '${siparis_no}' AND is_active = true `)


        const result = await pool.query('INSERT INTO product_detail_aksiyon( product_detail_id, aksiyon_aciklama, siparis_no, termin_tarih, termin_adet, cari,is_active) VALUES ($1,$2, $3, $4,$5,$6,true)', [product_detail_id, aksiyon_aciklama, siparis_no, termin_tarih, termin_adet, cari]);
        const datas = result.rows;

        res.status(200).json({ status: 200 })


    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
})
router.post('/productDetails', cors(), async (req, res) => {
    const data = req.body.data

    try {
        data.forEach(async element => {
            const result = await pool.query('INSERT INTO product_detail(product_code, anaurunkodu, urunadi,siparis_urun,is_active) VALUES ($1,$2, $3, $4,$5)', [element.product_code, element.anaurunkodu, element.urunadi, element.siparis_urun, true]);
            const datas = result;

        });
        res.status(200).json({ status: 200 });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
})
router.post('/productDetailAksiyonPut', cors(), async (req, res) => {
    const { id, product_detail_id, aksiyon_aciklama, siparis_no, termin_tarih, termin_adet, cari } = req.body;
    try {
        const result = await pool.query('UPDATE product_detail_aksiyon SET product_detail_id=$1, aksiyon_aciklama=$2, siparis_no=$3,termin_tarih=$4,termin_adet=$5,cari=$7  WHERE id = $6', [product_detail_id, aksiyon_aciklama, siparis_no, termin_tarih, termin_adet, id, cari]);
        const data = result.rows;
        res.status(200).json({ data });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
})


router.post('/productDetailPut', cors(), async (req, res) => {
    console.log(req.body)
    let data = req.body
    const { id, ay, cari, siparis_no, aciklama, aciklama2, is_active, termin, termin2, product_code, anaurunkodu, urunadi } = req.body;
    try {
        data.forEach(async element => {
            const result = await pool.query('UPDATE product_detail SET product_code=$1, anaurunkodu=$2, urunadi=$3,is_active=$4 WHERE id = $5', [element.product_code, element.siparis_urun, element.urunadi, false, element.id]);
            const data = result.rows;
            res.status(200).json({ data });
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
})

router.post('/postMissingMetaial', cors(), async (req, res) => {
    const { data } = req.body;
    try {
        data.forEach(async element => {
            const result = await pool.query('INSERT INTO public.missing_material(ust_kod, urun_kodu, urun_aciklama, april, august, december, february, january, july, june, march, may, november, october, september)	VALUES (element.kod, element.urunKodu,element.aciklama, element.April, element.August, element.December, element.February, element.January, element.July, element.June, element.March, element.May,element.November,element.October,September)');
            let dataInsert = result.rows;
        });



        res.status(200).json();
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
})
// Belirli bir veriyi getiren endpoint
router.get('/veriler/:id', (req, res) => {
    const id = req.params.id;
    const veri = data.find(item => item.id === id);

    if (!veri) {
        res.status(404).json({ error: 'Veri bulunamadı.' });
    } else {
        res.json(veri);
    }
});
router.get('/satinalma/:code', cors(), (req, res) => {
    const code = req.body.code.toString();
    getToken((error, access_token) => {
        if (error) {
            console.error(error);
            res.status(500).json({ error: 'Internal Server Error' });
            return;
        }

        const url = `http://20.0.0.14:32001/api/v1/queries?tsql=SELECT *FROM SATINALMA_SIPARIS_224 WHERE KOD = '${code}'  `; // API endpointini doğru şekilde belirtin
        const options = {
            method: 'GET',
            url: url,
            headers: {
                Authorization: `Bearer ${access_token.access_token}`,
                'Content-Type': 'application/json',
                Accept: 'application/json'
            }
        };
        request(options, function (error, response, body) {
            if (error) {
                console.error(error);
                res.status(500).json({ error: 'Internal Server Error' });
                return;
            }

            const parsedBody = JSON.parse(body);

            siparisler = parsedBody.items || []; // "items" özelliğini kullanarak sipariş verilerini alın


            res.json(siparisler); // İşlenen veriyi JSON olarak yanıt olarak gönderin
        });

    });
});
router.post('/satinalmas', cors(), async (req, res) => {
    const code = req.body.code;
    if (code !== null) {
        getToken((error, access_token) => {
            if (error) {
                console.error(error);
                res.status(500).json({ error: 'Internal Server Error' });
                return;
            }

            const url = `http://20.0.0.14:32001/api/v1/queries?tsql=SELECT * FROM SATINALMA_SIPARIS_224 WHERE KOD = '${code}' `; // API endpointini doğru şekilde belirtin
            const options = {
                method: 'GET',
                url: url,
                headers: {
                    Authorization: `Bearer ${access_token.access_token}`,
                    'Content-Type': 'application/json',
                    Accept: 'application/json'
                }
            };

            request(options, function (error, response, body) {
                if (error) {
                    console.error(error);
                    res.status(500).json({ error: 'Internal Server Error' });
                    return;
                }

                const parsedBody = JSON.parse(body);

                siparisler = parsedBody.items || []; // "items" özelliğini kullanarak sipariş verilerini alın
                const acikSiparisler = siparisler.filter(siparis => {
                    // Varsayılan olarak, 'TARİH' alanındaki değer 'gg.aa.yyyy' formatında
                    const tarih = siparis['TARİH'];

                    // Eğer tarih 'gg.aa.yyyy' formatında değilse veya 'TARİH' boşsa bu öğeyi filtre dışı bırak
                    if (!tarih || !/^(\d{2})\.(\d{2})\.(\d{4})$/.test(tarih)) {
                        return false;
                    }

                    // 'gg.aa.yyyy' formatındaki tarihi ayrıştır ve Date nesnesine dönüştür
                    const [gun, ay, yil] = tarih.split('.').map(Number);
                    const dateObject = new Date(yil, ay - 1, gun); // Ay değeri 0-11 aralığında olduğu için bir eksiltme yapılır

                    // Örneğin, bu filtre 'TARİH' alanı 10.01.2023 ve 'AÇIK SİPARİŞ' alanı 10'dan büyük olanları geçerli kılacak
                    return siparis['AÇIK SİPARİŞ'] > 10 && siparis['KOD'] !== null && dateObject;
                });

                res.json(acikSiparisler); // İşlenen veriyi JSON olarak yanıt olarak gönderin
            });

        });
    }
});
router.post('/satinalmaTermin', cors(), async (req, res) => {
    const code = req.params.code;


    const url = `http://20.0.0.14:32001/api/v1/queries?tsql=SELECT * FROM SATINALMA_SIPARIS_224 `; // API endpointini doğru şekilde belirtin
    const options = {
        method: 'GET',
        url: url,
        headers: {
            Authorization: `Bearer ${req.body.access_token}`,
            'Content-Type': 'application/json',
            Accept: 'application/json'
        }
    };
    request(options, function (error, response, body) {
        if (error) {
            console.error(error);
            res.status(500).json({ error: 'Internal Server Error' });
            return;
        }

        const parsedBody = JSON.parse(body);

        siparisler = parsedBody.items || []; // "items" özelliğini kullanarak sipariş verilerini alın


        res.json({ status: 200, siparisler: siparisler }); // İşlenen veriyi JSON olarak yanıt olarak gönderin
    });


});
router.get('/ambarlar/:code', cors(), (req, res) => {
    const code = req.params.code;
    getToken((error, access_token) => {
        if (error) {
            console.error(error);

            res.status(500).json({ error: 'Internal Server Error' });
            return;

        }
        // const query = encodeURIComponent("SELECT * FROM AMBAR_TOPLAMLARI_224 WHERE KODU = '" + code + "'");
        // const url = `http://20.0.0.14:32001/api/v1/queries?tsql=${query}`;

        const url = `http://20.0.0.14:32001/api/v1/queries?tsql=${encodeURIComponent("SELECT * FROM AMBAR_TOPLAMLARI_224 WHERE KODU = '" + code + "' AND MİKTAR > 0 AND DEPO != 'Şube Tekrar Lens Deposu' AND DEPO != 'AHO Hurda-Fire' AND DEPO != 'Sevkiyat' AND DEPO != 'Bakım Onarım Deposu' AND DEPO != 'Ek Uygunsuzluk Deposu' AND DEPO != 'İthalat Deposu' AND DEPO != 'Aselsan Hurda-Fire Yansıtma' AND DEPO != 'Rework Deposu' AND DEPO != 'İade Deposu' AND DEPO != 'Sabit Kıymet Deposu' AND DEPO != 'Ankara AR-GE Üretim Deposu' AND DEPO != 'Bilgi İşlem Deposu' ")}`;

        const options = {
            method: 'GET',
            url: url,
            headers: {
                Authorization: `Bearer ${access_token.access_token}`,
                'Content-Type': 'application/json',
                Accept: 'application/json'
            }
        };

        request(options, function (error, response, body) {
            if (error) {
                console.error(error);
                res.status(500).json({ error: 'Internal Server Error' });
                return;
            }

            const parsedBody = JSON.parse(body);

            ambar = parsedBody.items || []; // "items" özelliğini kullanarak sipariş verilerini alın


            res.json(ambar); // İşlenen veriyi JSON olarak yanıt olarak gönderin
        });

    });
});
router.post('/ambarlars', cors(), (req, res) => {
    const code = req.body.code;
    const code2 = req.body.code2;
    getToken((error, access_token) => {
        if (error) {
            console.error(error);

            res.status(500).json({ error: 'Internal Server Error' });
            return;

        }
        // const query = encodeURIComponent("SELECT * FROM AMBAR_TOPLAMLARI_224 WHERE KODU = '" + code + "'");
        // const url = `http://20.0.0.14:32001/api/v1/queries?tsql=${query}`;

        const url = `http://20.0.0.14:32001/api/v1/queries?tsql=${encodeURIComponent("SELECT * FROM AMBAR_TOPLAMLARI_224 WHERE( KODU = '" + code + "') AND MİKTAR > 0 AND DEPO != 'Şube Tekrar Lens Deposu' AND DEPO != 'AHO Hurda-Fire' AND DEPO != 'Sevkiyat' AND DEPO != 'Bakım Onarım Deposu' AND DEPO != 'Ek Uygunsuzluk Deposu' AND DEPO != 'İthalat Deposu' AND DEPO != 'Aselsan Hurda-Fire Yansıtma' AND DEPO != 'Rework Deposu' AND DEPO != 'İade Deposu' AND DEPO != 'Sabit Kıymet Deposu' AND DEPO != 'Ankara AR-GE Üretim Deposu' AND DEPO != 'Bilgi İşlem Deposu' ")}`;

        const options = {
            method: 'GET',
            url: url,
            headers: {
                Authorization: `Bearer ${access_token.access_token}`,
                'Content-Type': 'application/json',
                Accept: 'application/json'
            }
        };
        request(options, function (error, response, body) {
            if (error) {
                console.error(error);
                res.status(500).json({ error: 'Internal Server Error' });
                return;
            }

            const parsedBody = JSON.parse(body);

            ambar = parsedBody.items || []; // "items" özelliğini kullanarak sipariş verilerini alın


            res.json(ambar); // İşlenen veriyi JSON olarak yanıt olarak gönderin
        });

    });
});

router.get('/sumCustumOrder', cors(), (req, res) => {
    const code = req.params.code;

    getToken((error, access_token) => {
        if (error) {
            console.error(error);
            res.status(500).json({ error: 'Internal Server Error' });
            return;
        }

        const url = `http://20.0.0.14:32001/api/v1/queries?tsql=SELECT *FROM SATIS_SIPARISLERI_224`; // API endpointini doğru şekilde belirtin
        const options = {
            method: 'GET',
            url: url,
            headers: {
                Authorization: `Bearer ${access_token.access_token}`,
                'Content-Type': 'application/json',
                Accept: 'application/json'
            }
        };
        request(options, function (error, response, body) {
            if (error) {
                console.error(error);
                res.status(500).json({ error: 'Internal Server Error' });
                return;
            }

            const parsedBody = JSON.parse(body);
            siparisler = parsedBody.items || []; // "items" özelliğini kullanarak sipariş verilerini alın


            res.json(siparisler); // İşlenen veriyi JSON olarak yanıt olarak gönderin
        });

    });
});

router.post('/getKalibrasyonMetarial', cors(), async (req, res) => {
    try {
        const result = await pool.query('SELECT qe.id,qe.ekipman_no,qe.ekipman_name,qe.ekipman_no,qe.ekipman_type,qe.sorumlusu,qe.son_kalibrasyon,qe.gonderme_tarihi,qs.name as durumu,qd.name as birimi FROM quailty_ekipman qe Inner Join quality_status qs ON qs.id = qe.durumu Inner Join quailty_departman qd ON qe.birimi = qd.id');
        const data = result.rows;
        res.status(200).json({ status: 200, data: data });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
})

router.post('/getGlobalBomCek', cors(), async (req, res) => {
    try {
        const code = req.body.code
        const result = await pool.query(`select* from target_bom where siparis_urun = '${code}'`);
        const data = result.rows;

        res.status(200).json({ data: data });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
})
router.get('/gunlukCalisacakApi', cors(), (req, res) => {
    satisSiparis()
});
router.post('/cariSasGet', cors(), (req, res) => {
    const cari = req.body.cari
    getToken((error, access_token) => {
        if (error) {
            console.error(error);
            res.status(500).json({ error: 'Internal Server Error' });
            return;
        }
        const sqlQuery = `SELECT * FROM SATINALMA_SIPARIS_224 WHERE CARİ = '${cari}'`;
        const encodedQuery = encodeURIComponent(sqlQuery);
        const url = `http://20.0.0.14:32001/api/v1/queries?tsql=${encodedQuery}`; // API endpointini doğru şekilde belirtin
        const options = {
            method: 'GET',
            url: url,
            headers: {
                Authorization: `Bearer ${access_token.access_token}`,
                'Content-Type': 'application/json',
                Accept: 'application/json'
            }
        };
        request(options, function (error, response, body) {
            if (error) {
                console.error(error);
                res.status(500).json({ error: 'Internal Server Error' });
                return;
            }

            const parsedBody = JSON.parse(body);
            siparisler = parsedBody.items || []; // "items" özelliğini kullanarak sipariş verilerini alın
            console.log(siparisler)

            res.json(siparisler); // İşlenen veriyi JSON olarak yanıt olarak gönderin
        });
    });
});
router.get('/siparisler', cors(), (req, res) => {
    getToken((error, access_token) => {
        if (error) {
            console.error(error);
            res.status(500).json({ error: 'Internal Server Error' });
            return;
        }

        const url = `http://20.0.0.14:32001/api/v1/queries?tsql=SELECT *FROM SATIS_SIPARISLERI_224`; // API endpointini doğru şekilde belirtin
        const options = {
            method: 'GET',
            url: url,
            headers: {
                Authorization: `Bearer ${access_token.access_token}`,
                'Content-Type': 'application/json',
                Accept: 'application/json'
            }
        };
        request(options, function (error, response, body) {
            if (error) {
                console.error(error);
                res.status(500).json({ error: 'Internal Server Error' });
                return;
            }

            const parsedBody = JSON.parse(body);
            siparisler = parsedBody.items || []; // "items" özelliğini kullanarak sipariş verilerini alın
            transformedSiparisler = groupAndSumSiparisler(siparisler); // Siparişleri dönüştürün

            res.json(transformedSiparisler); // İşlenen veriyi JSON olarak yanıt olarak gönderin
        });
    });
});

router.post('/satisSiparisDuzenleme', cors(), async (req, res) => {

    try {
        let duzenliSiparis = []
        let dataSiparis = await pool.query(`SELECT * FROM siparisler`)
        let siparisler = dataSiparis.rows
        for (const element of siparisler) {
            let siparisVarmi=[]
            let toplamMiktar = 0
            let updateSiparisLocalDuzen=0
            switch (element.teslim_tarihi) {

                case 'Aralık':
                    //bu ayda bu üründen var mı? 
                    //varsa update et
                    //yoksa insert et
                     siparisVarmi = await pool.query(`Select * from local_duzenli_siparis WHERE malzeme='${element.malzeme}'`)
                     
                    if (siparisVarmi.rowCount > 0) {
                        console.log(toplamMiktar)
                         toplamMiktar = element.acik_siparis
                        updateSiparisLocalDuzen = await pool.query(`UPDATE local_duzenli_siparis SET ay_1 = ${toplamMiktar}  WHERE id = ${siparisVarmi.rows[0].id}`)
                     } else {
                        console.log(toplamMiktar)
                        toplamMiktar = element.acik_siparis
                        
                        updateSiparisLocalDuzen = await pool.query(`INSERT INTO local_duzenli_siparis (proje, malzeme, malzeme_adi,ay_1) VALUES ('${element.proje}','${element.malzeme}','${element.malzeme_adi}',${toplamMiktar})`)
                      }
                    break;
                case 'Şubat':
                     siparisVarmi = await pool.query(`Select * from local_duzenli_siparis WHERE malzeme='${element.malzeme}'`)
                    if (siparisVarmi.rowCount > 0) {
                        console.log(toplamMiktar)
                        toplamMiktar = element.acik_siparis
                        updateSiparisLocalDuzen = await pool.query(`UPDATE local_duzenli_siparis SET ay_2 = ${toplamMiktar}`)
                     } else {
                        console.log(toplamMiktar)
                        toplamMiktar = element.acik_siparis
                        updateSiparisLocalDuzen = await pool.query(`INSERT INTO local_duzenli_siparis (proje, malzeme, malzeme_adi, ay_2) VALUES ('${element.proje}','${element.malzeme}','${element.malzeme_adi}',${toplamMiktar})`)
                      }
                    break;

                case 'Mart':
                    siparisVarmi = await pool.query(`Select * from local_duzenli_siparis WHERE malzeme='${element.malzeme}'`)
                    if (siparisVarmi.rowCount > 0) {
                        console.log(toplamMiktar)
                        toplamMiktar = element.acik_siparis
                        updateSiparisLocalDuzen = await pool.query(`UPDATE local_duzenli_siparis SET ay_3 = ${toplamMiktar}`)
                     } else {
                        toplamMiktar = element.acik_siparis
                        updateSiparisLocalDuzen = await pool.query(`INSERT INTO local_duzenli_siparis (proje, malzeme, malzeme_adi, ay_3) VALUES ('${element.proje}','${element.malzeme}','${element.malzeme_adi}',${toplamMiktar})`)
                      }
                    break;
                case 'Nisan':
                    siparisVarmi = await pool.query(`Select * from local_duzenli_siparis WHERE malzeme='${element.malzeme}'`)
                    if (siparisVarmi.rowCount > 0) {
                        toplamMiktar = element.acik_siparis
                        updateSiparisLocalDuzen = await pool.query(`UPDATE local_duzenli_siparis SET ay_4 = ${toplamMiktar}`)
                     } else {
                        toplamMiktar = element.acik_siparis
                        updateSiparisLocalDuzen = await pool.query(`INSERT INTO local_duzenli_siparis (proje, malzeme, malzeme_adi, ay_4) VALUES ('${element.proje}','${element.malzeme}','${element.malzeme_adi}',${toplamMiktar})`)
                      }
                    break;
                case 'Mayıs':
                    siparisVarmi = await pool.query(`Select * from local_duzenli_siparis WHERE malzeme='${element.malzeme}'`)
                    if (siparisVarmi.rowCount > 0) {
                        toplamMiktar = element.acik_siparis
                        updateSiparisLocalDuzen = await pool.query(`UPDATE local_duzenli_siparis SET ay_5 = ${toplamMiktar}`)
                     } else {
                        toplamMiktar = element.acik_siparis
                        updateSiparisLocalDuzen = await pool.query(`INSERT INTO local_duzenli_siparis (proje, malzeme, malzeme_adi, ay_5) VALUES ('${element.proje}','${element.malzeme}','${element.malzeme_adi}',${toplamMiktar})`)
                      }
                    break;

                case 'Haziran':
                    siparisVarmi = await pool.query(`Select * from local_duzenli_siparis WHERE malzeme='${element.malzeme}'`)
                    if (siparisVarmi.rowCount > 0) {
                        toplamMiktar = element.acik_siparis
                        updateSiparisLocalDuzen = await pool.query(`UPDATE local_duzenli_siparis SET ay_6 = ${toplamMiktar}`)
                     } else {
                        toplamMiktar = element.acik_siparis
                        updateSiparisLocalDuzen = await pool.query(`INSERT INTO local_duzenli_siparis (proje, malzeme, malzeme_adi, ay_6) VALUES ('${element.proje}','${element.malzeme}','${element.malzeme_adi}',${toplamMiktar})`)
                      }
                    break;
                case 'Temmuz':
                    siparisVarmi = await pool.query(`Select * from local_duzenli_siparis WHERE malzeme='${element.malzeme}'`)
                    if (siparisVarmi.rowCount > 0) {
                        toplamMiktar = element.acik_siparis
                        updateSiparisLocalDuzen = await pool.query(`UPDATE local_duzenli_siparis SET ay_7 = ${toplamMiktar}`)
                     } else {
                        toplamMiktar = element.acik_siparis
                        updateSiparisLocalDuzen = await pool.query(`INSERT INTO local_duzenli_siparis (proje, malzeme, malzeme_adi, ay_7) VALUES ('${element.proje}','${element.malzeme}','${element.malzeme_adi}',${toplamMiktar})`)
                      }
                    break;
                case 'Ağustos':
                    siparisVarmi = await pool.query(`Select * from local_duzenli_siparis WHERE malzeme='${element.malzeme}'`)
                    if (siparisVarmi.rowCount > 0) {
                        toplamMiktar = element.acik_siparis
                        updateSiparisLocalDuzen = await pool.query(`UPDATE local_duzenli_siparis SET ay_8 = ${toplamMiktar}`)
                     } else {
                        toplamMiktar = element.acik_siparis
                        updateSiparisLocalDuzen = await pool.query(`INSERT INTO local_duzenli_siparis (proje, malzeme, malzeme_adi, ay_8) VALUES ('${element.proje}','${element.malzeme}','${element.malzeme_adi}',${toplamMiktar})`)
                      }
                    break;
                case 'Eylül':
                    siparisVarmi = await pool.query(`Select * from local_duzenli_siparis WHERE malzeme='${element.malzeme}'`)
                    if (siparisVarmi.rowCount > 0) {
                        toplamMiktar = element.acik_siparis
                        updateSiparisLocalDuzen = await pool.query(`UPDATE local_duzenli_siparis SET ay_9 = ${toplamMiktar}`)
                     } else {
                        toplamMiktar = element.acik_siparis
                        updateSiparisLocalDuzen = await pool.query(`INSERT INTO local_duzenli_siparis (proje, malzeme, malzeme_adi, ay_9) VALUES ('${element.proje}','${element.malzeme}','${element.malzeme_adi}',${toplamMiktar})`)
                      }
                    break;
                case 'Ekim':
                    siparisVarmi = await pool.query(`Select * from local_duzenli_siparis WHERE malzeme='${element.malzeme}'`)
                    if (siparisVarmi.rowCount > 0) {
                        toplamMiktar = element.acik_siparis
                        updateSiparisLocalDuzen = await pool.query(`UPDATE local_duzenli_siparis SET ay_10 = ${toplamMiktar}`)
                     } else {
                        toplamMiktar = element.acik_siparis
                        updateSiparisLocalDuzen = await pool.query(`INSERT INTO local_duzenli_siparis (proje, malzeme, malzeme_adi, ay_10) VALUES ('${element.proje}','${element.malzeme}','${element.malzeme_adi}',${toplamMiktar})`)
                      }
                    break;
                case 'Kasım':
                    siparisVarmi = await pool.query(`Select * from local_duzenli_siparis WHERE malzeme='${element.malzeme}'`)
                    if (siparisVarmi.rowCount > 0) {
                        toplamMiktar = element.acik_siparis
                        updateSiparisLocalDuzen = await pool.query(`UPDATE local_duzenli_siparis SET ay_11 = ${toplamMiktar}`)
                     } else {
                        toplamMiktar = element.acik_siparis
                        updateSiparisLocalDuzen = await pool.query(`INSERT INTO local_duzenli_siparis (proje, malzeme, malzeme_adi, ay_11) VALUES ('${element.proje}','${element.malzeme}','${element.malzeme_adi}',${toplamMiktar})`)
                      }
                    break;
                case 'Aralık':
                    siparisVarmi = await pool.query(`Select * from local_duzenli_siparis WHERE malzeme='${element.malzeme}'`)
                    if (siparisVarmi.rowCount > 0) {
                        toplamMiktar = element.acik_siparis
                        updateSiparisLocalDuzen = await pool.query(`UPDATE local_duzenli_siparis SET ay_12 = ${toplamMiktar}`)
                     } else {
                        toplamMiktar = element.acik_siparis
                        updateSiparisLocalDuzen = await pool.query(`INSERT INTO local_duzenli_siparis (proje, malzeme, malzeme_adi, ay_12) VALUES ('${element.proje}','${element.malzeme}','${element.malzeme_adi}',${toplamMiktar})`)
                      }
                    break;
                case 'ESKİBORC':
                    siparisVarmi = await pool.query(`Select * from local_duzenli_siparis WHERE malzeme='${element.malzeme}'`)
                    if (siparisVarmi.rowCount > 0) {
                        toplamMiktar = 0
                        toplamMiktar = element.acik_siparis
                        updateSiparisLocalDuzen = await pool.query(`UPDATE local_duzenli_siparis SET gecmis = ${toplamMiktar}`)
                     } else {
                        toplamMiktar = element.acik_siparis
                        updateSiparisLocalDuzen = await pool.query(`INSERT INTO local_duzenli_siparis (proje, malzeme, malzeme_adi, gecmis) VALUES ('${element.proje}','${element.malzeme}','${element.malzeme_adi}',${toplamMiktar})`)
                      }
                    break;


                default:
                    break;
            }
        }

    } catch (error) {
        console.error(error)
    }

});


const satisSiparis = async () => {
    // Burada sorgunuzu çalıştırabilirsiniz, örneğin:
    try {
        getToken((error, access_token) => {
            if (error) {
                console.error(error);
                res.status(500).json({ error: 'Internal Server Error' });
                return;
            }

            const url = `http://20.0.0.14:32001/api/v1/queries?tsql=SELECT *FROM SATIS_SIPARISLERI_224`; // API endpointini doğru şekilde belirtin
            const options = {
                method: 'GET',
                url: url,
                headers: {
                    Authorization: `Bearer ${access_token.access_token}`,
                    'Content-Type': 'application/json',
                    Accept: 'application/json'
                }
            };
            request(options, function (error, response, body) {
                if (error) {
                    console.error(error);
                    res.status(500).json({ error: 'Internal Server Error' });
                    return;
                }

                const parsedBody = JSON.parse(body);
                siparisler = parsedBody.items || []; // "items" özelliğini kullanarak sipariş verilerini alın
                transformedSiparisler = groupAndSumSiparisler(siparisler); // Siparişleri dönüştürün

                console.log("bitti")
            });

        });

    } catch (error) {
        console.error(error);

    }
};


const yirmidortSaat = 24 * 60 * 60 * 1000;

setInterval(async () => {
    try {
        await satisSiparis();
        //await calistirSorguyu();

    } catch (error) {
        console.error(error);
    }
}, yirmidortSaat);


module.exports = router;
