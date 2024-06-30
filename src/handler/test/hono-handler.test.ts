import { Hono } from "hono"
import { setupHono } from "../../server"
import { databaseConnection } from "../../database"

let app: Hono
let db: any
let token: string = ""
describe("Gig Service Integration Testing", () => {
    beforeAll(async () => {
        app = new Hono()
        app = await setupHono(app)
        db = await databaseConnection()
        token =
            "eyJhbGciOiJIUzUxMiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTE2LCJlbWFpbCI6ImthdGx5bi5zbWl0aEBnbWFpbC5jb20iLCJ1c2VybmFtZSI6IlByb3BlcmFlcm9wbCIsImlhdCI6MTcxODg0MzQ2MSwiZXhwIjoxNzE4OTI5ODYxLCJpc3MiOiJKb2JiZXIgQXV0aCJ9.qlZIT9RriUawM1MEls3s1MBJjpkhuDlI9z_Pu3saY1XvWYPGa3WcTOwPnnG7rdHy9qnMaqjLiCEcf5Rspp8esw"
    })

    afterAll(() => {
        db.connection.close()
    })

    describe("GET /gig with param [/:gigId]", () => {
        it("Harus mengembalikan status_code 200 dan single data gig yang ada pada database", async () => {
            const gigId = "664d6353cf0fec9ffb355e66"
            const res = await app.request(`/gig/${gigId}`, {
                method: "GET",
                headers: new Headers({
                    Authorization: `Bearer ${token}`
                })
            })

            expect(res.status).toBe(200)
            const resBody = await res.json()
            expect(resBody).not.toBeNull()
            expect(Object.keys(resBody)).toEqual(["message", "gig"])
            expect(resBody.message).not.toBeNull()
            expect(resBody.gig).not.toBeNull()
        })

        it("Harus mengembalikan status_code 404 bahwa single data gig tidak ditemukan", async () => {
            const gigId = "notfoundgigid"
            const res = await app.request(`/gig/${gigId}`, {
                method: "GET",
                headers: new Headers({
                    Authorization: `Bearer ${token}`
                })
            })

            const resBody = await res.json()
            expect(res.status).toBe(404)
            expect(resBody).not.toBeNull()
            expect(Object.keys(resBody)).toEqual(["message", "gig"])
            expect(resBody.message).not.toBeNull()
            expect(resBody.gig).toEqual({})
        })
    })

    describe("GET /gig/seller with param [/:sellerId]", () => {
        it("Harus mengembalikan status_code 200 dan array data gig yang ada pada database", async () => {
            const sellerId = "6644215d6fdffcf6c3a6d94e"
            const res = await app.request(`/gig/seller/${sellerId}`, {
                method: "GET",
                headers: new Headers({
                    Authorization: `Bearer ${token}`
                })
            })

            const resBody = await res.json()
            expect(res.status).toBe(200)
            expect(resBody).not.toBeNull()
            expect(Object.keys(resBody)).toEqual(["message", "gigs"])
            expect(resBody.message).not.toBeNull()
            expect(resBody.gigs).not.toBeNull()
        })

        it("Harus mengembalikan status_code 200 dan array kosong", async () => {
            const sellerId = "notfoundsellerid"
            const res = await app.request(`/gig/seller/${sellerId}`, {
                method: "GET",
                headers: new Headers({
                    Authorization: `Bearer ${token}`
                })
            })

            const resBody = await res.json()
            expect(res.status).toBe(200)
            expect(resBody).not.toBeNull()
            expect(Object.keys(resBody)).toEqual(["message", "gigs"])
            expect(resBody.message).not.toBeNull()
            expect(resBody.gigs).toEqual([])
        })
    })

    describe("GET /gig/inactive with param [/:gigId]", () => {
        it("Harus mengembalikan status_code 200 dan array data gig (yang berstatus tidak aktif) yang ada pada database", async () => {
            const sellerId = "6644215d6fdffcf6c3a6d94e"
            const res = await app.request(`/gig/seller/inactive/${sellerId}`, {
                method: "GET",
                headers: new Headers({
                    Authorization: `Bearer ${token}`
                })
            })

            const resBody = await res.json()
            expect(res.status).toBe(200)
            expect(resBody).not.toBeNull()
            expect(Object.keys(resBody)).toEqual(["message", "gigs"])
            expect(resBody.message).not.toBeNull()
            expect(resBody.gigs).not.toBeNull()
        })

        it("Harus mengembalikan status_code 200 dan array kosong", async () => {
            const sellerId = "notfoundsellerid"
            const res = await app.request(`/gig/seller/inactive/${sellerId}`, {
                method: "GET",
                headers: new Headers({
                    Authorization: `Bearer ${token}`
                })
            })

            const resBody = await res.json()
            expect(res.status).toBe(200)
            expect(resBody).not.toBeNull()
            expect(Object.keys(resBody)).toEqual(["message", "gigs"])
            expect(resBody.message).not.toBeNull()
            expect(resBody.gigs).toEqual([])
        })
    })

    describe("GET /gig/search with params [/:from/:size/:type] and query [?query&delivery_time&min&max]", () => {
        it("Harus mengembalikan status_code 200 dan array data gig #1 - parameter [170/8/backward] dan query [query=desain&delivery_time=10&min=0&max=50]", async () => {
            const params = "170/8/backward"
            const queries = "query=desain&delivery_time=10&min=0&max=50"
            const res = await app.request(`/gig/search/${params}?${queries}`, {
                method: "GET",
                headers: new Headers({
                    Authorization: `Bearer ${token}`
                })
            })

            expect(res.status).toBe(200)
            const resBody = await res.json()
            expect(resBody).not.toBeNull()
            expect(Object.keys(resBody)).toEqual(["message", "total", "gigs"])
            expect(resBody.message).not.toBeNull()
            expect(resBody.total).not.toBeNull()
            expect(resBody.total).toBeGreaterThanOrEqual(0)
            expect(resBody.gigs).not.toBeNull()
        })

        it("Harus mengembalikan status_code 200 dan array data gig #2 - parameter [0/20/forward] dan query [query=data&delivery_time=20&min=0&max=75]", async () => {
            const params = "0/20/forward"
            const queries = "query=data&delivery_time=20&min=0&max=75"
            const res = await app.request(`/gig/search/${params}?${queries}`, {
                method: "GET",
                headers: new Headers({
                    Authorization: `Bearer ${token}`
                })
            })

            expect(res.status).toBe(200)
            const resBody = await res.json()
            expect(resBody).not.toBeNull()
            expect(Object.keys(resBody)).toEqual(["message", "total", "gigs"])
            expect(resBody.message).not.toBeNull()
            expect(resBody.total).not.toBeNull()
            expect(resBody.total).toBeGreaterThanOrEqual(0)
            expect(resBody.gigs).not.toBeNull()
        })
    })

    describe("GET /gig/category with param [/:username]", () => {
        it("Harus mengembalikan status_code 200 dan array gig sesuai dengan kategori yang dipilih pengguna yang telah tersimpan pada database Redis", async () => {
            const username = "Painfulpillo"
            const res = await app.request(`/gig/category/${username}`, {
                method: "GET",
                headers: new Headers({
                    Authorization: `Bearer ${token}`
                })
            })

            expect(res.status).toBe(200)
            const resBody = await res.json()
            expect(resBody).not.toBeNull()
            expect(Object.keys(resBody)).toEqual(["message", "total", "gigs"])
            expect(resBody.message).not.toBeNull()
            expect(resBody.total).not.toBeNull()
            expect(resBody.total).toBeGreaterThanOrEqual(0)
            expect(resBody.gigs).not.toBeNull()
        })
    })

    describe("GET /gig/top with param [/:username]", () => {
        it("Harus mengembalikan status_code 200 dan array gig sesuai dengan kategori jasa yang sering dilihat oleh pengguna yang tersimpan pada database Redis", async () => {
            const username = "Painfulpillo"
            const res = await app.request(`/gig/top/${username}`, {
                method: "GET",
                headers: new Headers({
                    Authorization: `Bearer ${token}`
                })
            })

            expect(res.status).toBe(200)
            const resBody = await res.json()
            expect(resBody).not.toBeNull()
            expect(Object.keys(resBody)).toEqual(["message", "total", "gigs"])
            expect(resBody.message).not.toBeNull()
            expect(resBody.total).not.toBeNull()
            expect(resBody.total).toBeGreaterThanOrEqual(0)
            expect(resBody.gigs).not.toBeNull()
        })
    })

    describe("GET /gig/similar with param [/:gigId]", () => {
        it("Harus mengembalikan status_code 200 dan array gigs yang informasi data-nya memiliki kemiripan dengan gig yang memiliki gigId yang dikirimkan", async () => {
            const gigId = "664d6353cf0fec9ffb355e66"
            const res = await app.request(`/gig/similar/${gigId}`, {
                method: "GET",
                headers: new Headers({
                    Authorization: `Bearer ${token}`
                })
            })

            expect(res.status).toBe(200)
            const resBody = await res.json()
            expect(resBody).not.toBeNull()
            expect(Object.keys(resBody)).toEqual(["message", "total", "gigs"])
            expect(resBody.message).not.toBeNull()
            expect(resBody.total).not.toBeNull()
            expect(resBody.gigs).not.toBeNull()
        })
    })

    describe("PUT /gig/update with param [/:gigId]", () => {
        // it("Harus mengembalikan status_code 200 dan data data gig yang telah diperbarui sama nilai-nya dengan reqBody yang dikirimkan", async () => {
        //     const gigId = "664d6353cf0fec9ffb355e34"
        //     const reqBody: any = {
        // title: "I will build a Fullstack website e-commerece apps with NextJS",
        // description:
        //     "I will build a Fullstack website e-commerce apps with NextJS for you",
        // basicTitle: "Fullstack website e-commerce NextJS",
        // basicDescription:
        //     "Fullstack website e-commerce with NextJS technology",
        // categories: "Tech & Programming",
        // subCategories: ["Website", "NextJS", "E-Commerce"],
        // tags: ["Website", "Fullstack", "NextJS", "E-Commerce"],
        // active: true,
        // expectedDelivery: "14 Days Delivery",
        // price: 40,
        // sortId: 102,
        // coverImage: "https/:/picsum.photos/seed/ZGGWFJ01/640/480"
        //     }

        //     const res = await app.request(`/gig/update/${gigId}`, {
        //         method: "PUT",
        //         headers: new Headers({ Authorization: `Bearer ${token}` }),
        //         body: JSON.stringify(reqBody)
        //     })

        //     expect(res.status).toBe(200)
        //     const resBody = await res.json()
        //     expect(resBody).not.toBeNull()
        //     expect(Object.keys(resBody)).toEqual(["message", "gig"])

        //     Object.keys(reqBody).forEach((key, _) => {
        //         expect(reqBody[key]).toEqual(resBody.gig[key])
        //     })
        // })

        it("Harus mengembalikan status_code 404 bahwa data gig berdasarkan gigId tidak ditemukan pada database", async () => {
            const gigId = "6644215d6fdffcf6c3a6d9d0"
            const newGigData = {}

            const res = await app.request(`/gig/update/${gigId}`, {
                method: "PUT",
                headers: new Headers({
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json"
                }),
                body: JSON.stringify(newGigData)
            })

            expect(res.status).toBe(404)
            const resBody = await res.json()
            expect(resBody).not.toBeNull()
            expect(Object.keys(resBody)).toEqual(["message", "gig"])
            expect(resBody.message).not.toBeNull()
            expect(resBody.gig).toEqual({})
        })
    })

    describe("PUT /gig/status with param [/:gigId]", () => {
        // it("Harus mengembalikan status_code 200 dan mengembalikan data gig yang telah diperbarui dan sesuai dengan data yang dikirimkan", async () => {
        //     const gigId = "664d6353cf0fec9ffb355e34"
        //     const reqBody = {
        //         active: false
        //     }

        //     const res = await app.request(`/gig/status/${gigId}`, {
        //         method: "PUT",
        //         headers: new Headers({ Authorization: `Bearer ${token}` }),
        //         body: JSON.stringify(reqBody)
        //     })

        //     expect(res.status).toBe(200)
        //     const resBody = await res.json()
        //     expect(resBody).not.toBeNull()
        //     expect(Object.keys(resBody)).toEqual(["message", "gig"])
        //     expect(resBody.message).not.toBeNull()
        //     expect(resBody.gig).not.toBeNull()
        //     expect(resBody.gig.active).toEqual(reqBody.active)
        // })

        it("Harus mengembalikan status_code 404 bahwa data gig berdasarkan gigId tidak ditemukan pada database", async () => {
            const gigId = "6644215d6fdffcf6c3a6d9d0"
            const reqBody = {
                active: true
            }

            const res = await app.request(`/gig/status/${gigId}`, {
                method: "PUT",
                headers: new Headers({
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json"
                }),
                body: JSON.stringify(reqBody)
            })

            expect(res.status).toBe(404)
            const resBody = await res.json()
            expect(resBody).not.toBeNull()
            expect(Object.keys(resBody)).toEqual(["message", "gig"])
        })
    })

    describe("DELETE /gig with param [/:gigId/:sellerId]", () => {
        // it("Harus mengembalikan status_code 200", async () => {
        //     const gigId = "664d6353cf0fec9ffb355e34"
        //     const sellerId = "6644215d6fdffcf6c3a6d9d0"

        //     const res = await app.request(`/gig/${gigId}/${sellerId}`, {
        //         method: "DELETE",
        //         headers: new Headers({ Authorization: `Bearer ${token}` })
        //     })

        //     expect(res.status).toBe(200)
        //     const resBody = await res.json()
        //     expect(resBody).not.toBeNull()
        //     expect(Object.keys(resBody)).toEqual(["message"])
        //     expect(resBody.message).not.toBeNull()
        // })

        it("Harus mengembalikan status_code 404 bahwa data gig berdasarkan gigId dan sellerId tidak ditemukan pada database", async () => {
            const gigId = "6644215d6fdffcf6c3a6d9d0"
            const sellerId = "6644215d6fdffcf6c3a6d9d0"

            const res = await app.request(`/gig/${gigId}/${sellerId}`, {
                method: "DELETE",
                headers: new Headers({ Authorization: `Bearer ${token}` })
            })

            expect(res.status).toBe(404)
            const resBody = await res.json()
            expect(resBody).not.toBeNull()
            expect(Object.keys(resBody)).toEqual([
                "message",
                "statusCode",
                "status",
                "comingFrom"
            ])
            expect(resBody.message).not.toBeNull()
        })
    })
})
