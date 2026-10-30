CREATE DATABASE  IF NOT EXISTS `localizaufjf` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci */ /*!80016 DEFAULT ENCRYPTION='N' */;
USE `localizaufjf`;
-- MySQL dump 10.13  Distrib 8.0.41, for Win64 (x86_64)
--
-- Host: localhost    Database: localizaufjf
-- ------------------------------------------------------
-- Server version	8.0.41

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `driver_sessions`
--

DROP TABLE IF EXISTS `driver_sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `driver_sessions` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `driver_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `license_plate` varchar(8) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `bus_line_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `socket_id` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `started_at` datetime(3) NOT NULL DEFAULT (utc_timestamp(3)),
  `last_seen_at` datetime(3) NOT NULL DEFAULT (utc_timestamp(3)),
  `last_sample_at` datetime(3) DEFAULT NULL,
  `closed_at` datetime(3) DEFAULT NULL,
  `active_vehicle` varchar(8) CHARACTER SET ascii COLLATE ascii_bin GENERATED ALWAYS AS (if((`closed_at` is null),`license_plate`,NULL)) STORED,
  `active_driver` char(36) COLLATE utf8mb4_unicode_ci GENERATED ALWAYS AS (if((`closed_at` is null),`driver_id`,NULL)) STORED,
  PRIMARY KEY (`id`),
  UNIQUE KEY `one_session_per_vehicle` (`active_vehicle`),
  UNIQUE KEY `one_session_per_driver` (`active_driver`),
  KEY `sessions_expiry` (`closed_at`,`last_seen_at`),
  KEY `driver_id` (`driver_id`),
  KEY `license_plate` (`license_plate`),
  KEY `bus_line_id` (`bus_line_id`),
  CONSTRAINT `driver_sessions_ibfk_1` FOREIGN KEY (`driver_id`) REFERENCES `users` (`id`),
  CONSTRAINT `driver_sessions_ibfk_2` FOREIGN KEY (`license_plate`) REFERENCES `license_plates` (`plate`),
  CONSTRAINT `driver_sessions_ibfk_3` FOREIGN KEY (`bus_line_id`) REFERENCES `bus_lines` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `driver_sessions`
--

LOCK TABLES `driver_sessions` WRITE;
/*!40000 ALTER TABLE `driver_sessions` DISABLE KEYS */;
INSERT INTO `driver_sessions` (`id`, `driver_id`, `license_plate`, `bus_line_id`, `socket_id`, `started_at`, `last_seen_at`, `last_sample_at`, `closed_at`) VALUES ('0cb1b938-d2e3-4f85-b554-ecef77fa2a02','206c642c-faa4-4d2a-9053-575a310449b2','GOV-1234','08ed0e81-d175-4220-9c5a-58079a395df3','Arwd7QmpF4IMJQHqAAAB','2026-10-30 13:46:15.071','2026-10-30 14:28:27.478','2026-10-30 14:28:27.466','2026-10-30 14:29:25.481'),('100caad2-b9e8-4ab5-8fb7-1f88cb6f3100','206c642c-faa4-4d2a-9053-575a310449b2','GOV-1234','b88c4d98-913b-413b-a212-b3827f7e0bf4','uTRwHHN3iLfkdeN4AAAA','2026-10-30 12:43:37.807','2026-10-30 13:17:54.016','2026-10-30 13:17:54.008','2026-10-30 13:17:57.036'),('354dcfa2-4f15-4dae-9086-ae146d0d55cb','206c642c-faa4-4d2a-9053-575a310449b2','GOV-1234','08ed0e81-d175-4220-9c5a-58079a395df3','xr7ESjwODW6rSHSXAAAB','2026-10-30 14:31:33.716','2026-10-30 15:31:02.902','2026-10-30 15:31:02.857','2026-10-30 15:31:02.930'),('666139b8-751b-4336-b3ef-011ad8c852b7','206c642c-faa4-4d2a-9053-575a310449b2','GOV-1234','b88c4d98-913b-413b-a212-b3827f7e0bf4','QACtI-pCs4f3baGcAAAB','2026-10-30 01:55:48.586','2026-10-30 01:55:54.412','2026-10-30 01:55:53.478','2026-10-30 01:56:10.174'),('7f3601c3-1f25-4d7f-ab77-b4de7241fc4f','206c642c-faa4-4d2a-9053-575a310449b2','GOV-1234','b88c4d98-913b-413b-a212-b3827f7e0bf4','3YLRoHahB30lTCeCAAAH','2026-10-30 01:14:30.681','2026-10-30 01:19:11.779','2026-10-30 01:19:11.770','2026-10-30 01:19:14.812'),('97e93a48-0f1b-4c87-929c-b5a412aeb497','206c642c-faa4-4d2a-9053-575a310449b2','GOV-1234','b88c4d98-913b-413b-a212-b3827f7e0bf4','N5PAaYL9Ql2A1iVZAAAC','2026-10-30 03:22:31.989','2026-10-30 03:24:27.073','2026-10-30 03:24:27.057','2026-10-30 03:24:30.102'),('b34762be-1e6e-4110-8c04-cc97bba4393a','206c642c-faa4-4d2a-9053-575a310449b2','GOV-1234','b88c4d98-913b-413b-a212-b3827f7e0bf4','x8qNh8VC9gZOdxB6AAAL','2026-10-28 18:55:26.703','2026-10-28 18:55:45.628','2026-10-28 18:55:30.143','2026-10-28 18:55:54.839'),('e0d6e19b-2f52-4eea-bf37-fdc14705243d','206c642c-faa4-4d2a-9053-575a310449b2','GOV-1234','b88c4d98-913b-413b-a212-b3827f7e0bf4','CZStKpH6G9EC4UVhAAAG','2026-10-28 18:51:30.318','2026-10-28 18:53:38.315','2026-10-28 18:53:24.076','2026-10-28 18:54:09.251'),('ef400096-82d5-4f07-a5ae-219eafecdaf3','206c642c-faa4-4d2a-9053-575a310449b2','GOV-1234','7d902398-25b2-43c3-9ac7-cc471dbc75e3','udH0Uc1L9rcwjLtKAAAN','2026-10-30 15:31:10.832','2026-10-30 15:31:15.701','2026-10-30 15:30:56.372','2026-10-30 15:31:24.222');
/*!40000 ALTER TABLE `driver_sessions` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-10-30 12:43:54
