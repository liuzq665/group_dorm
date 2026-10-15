package com.dorm.platform.job;
import com.dorm.platform.repair.service.RepairService;
import com.dorm.platform.stay.service.StayService;
import com.dorm.platform.notice.service.NoticeService;
import org.springframework.scheduling.annotation.*;
import org.springframework.stereotype.Component;
@Component @EnableScheduling
public class WorkflowJobs {
 private final RepairService repair; private final StayService stay; private final NoticeService notice;
 public WorkflowJobs(RepairService repair,StayService stay,NoticeService notice){this.repair=repair;this.stay=stay;this.notice=notice;}
 @Scheduled(fixedDelayString="${workflow.delay-ms:30000}",initialDelayString="${workflow.delay-ms:30000}") public void repair(){repair.tick();}
 @Scheduled(fixedDelayString="${workflow.delay-ms:30000}",initialDelayString="${workflow.delay-ms:30000}") public void stay(){stay.tick();}
 @Scheduled(fixedDelayString="${workflow.delay-ms:30000}",initialDelayString="${workflow.delay-ms:30000}") public void notices(){notice.deliver();}
}
